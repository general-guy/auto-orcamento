const { spawn } = require("node:child_process");
const path = require("node:path");
const { normalizeNotifyRelativePath } = require("./atlas-notify");

const {
  createAxisSyncSessionLogger,
  resolveAxisSyncLogDir,
} = require("./axis-sync-session-log");

const DEFAULT_LOCAL_ATLAS = path.join(
  "C:",
  "Users",
  "geral",
  "OneDrive",
  "Documentos",
  "2.Projetos",
  "local-atlas",
);

const syncClients = new Set();
let queue = Promise.resolve();
let syncLogDir = null;
let startupQueued = false;
const STARTUP_FALLBACK_MS = 90 * 1000;
/** @type {{ event: object, at: number }[]} */
const toastReplayBuffer = [];
const TOAST_REPLAY_MAX = 15;
const TOAST_REPLAY_MAX_AGE_MS = 3 * 60 * 1000;
/** Debounce window to merge rapid push/pull into one Python spawn. */
const COALESCE_MS = 400;

/**
 * @typedef {{ flag: string, paths: Set<string>, waiters: Array<(code: number) => void>, timer: ReturnType<typeof setTimeout> | null }} CoalesceBucket
 * @type {{ push: CoalesceBucket, pull: CoalesceBucket }}
 */
const coalesceBuckets = {
  push: {
    flag: "--push-relative",
    paths: new Set(),
    waiters: [],
    timer: null,
  },
  pull: {
    flag: "--pull-if-remote-newer",
    paths: new Set(),
    waiters: [],
    timer: null,
  },
};

function rememberToast(event) {
  if (!event || event.type !== "toast") {
    return;
  }
  toastReplayBuffer.push({ event, at: Date.now() });
  while (toastReplayBuffer.length > TOAST_REPLAY_MAX) {
    toastReplayBuffer.shift();
  }
}

function replayRecentToasts(response) {
  const now = Date.now();
  for (const row of toastReplayBuffer) {
    if (now - row.at > TOAST_REPLAY_MAX_AGE_MS) {
      continue;
    }
    try {
      response.write(`data: ${JSON.stringify(row.event)}\n\n`);
    } catch {
      break;
    }
  }
}

function resolveLocalAtlasRoot() {
  const override = String(process.env.AUTO_ORCAMENTO_LOCAL_ATLAS || "").trim();
  return path.resolve(override || DEFAULT_LOCAL_ATLAS);
}

function isSyncEnabled(bindHost) {
  if (process.platform !== "win32") {
    return false;
  }
  const host = String(bindHost || "127.0.0.1").trim();
  return host === "127.0.0.1" || host === "localhost" || host === "::1";
}

function broadcast(event) {
  rememberToast(event);
  const payload = `data: ${JSON.stringify(event)}\n\n`;
  for (const client of syncClients) {
    try {
      client.response.write(payload);
    } catch {
      syncClients.delete(client);
    }
  }
}

function parseStdoutChunk(buffer, onToast) {
  const lines = buffer.split(/\r?\n/);
  const rest = lines.pop() || "";
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("{")) {
      continue;
    }
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed.type === "toast") {
        onToast(parsed);
      }
    } catch {
      // ignore non-JSON log lines from Python
    }
  }
  return rest;
}

function runPythonSync(argv, { taskName = "sync", timeoutMs = 4 * 60 * 60 * 1000 } = {}) {
  const script = path.join(resolveLocalAtlasRoot(), "axis", "scripts", "sync_auto_orcamento.py");
  const sessionLog = createAxisSyncSessionLogger(syncLogDir, {
    taskName,
    argv,
    scriptPath: script,
  });

  return new Promise((resolve) => {
    const proc = spawn("py", ["-3", script, ...argv], {
      cwd: resolveLocalAtlasRoot(),
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
      env: {
        ...process.env,
        // Toasts JSON com acentos; sem isso o stdout do py no Windows sai em cp1252 e o Node lê como UTF-8.
        PYTHONIOENCODING: "utf-8",
        PYTHONUTF8: "1",
      },
    });

    let stdoutBuffer = "";
    let settled = false;
    let timedOut = false;
    let failureToastSent = false;
    const onPythonToast = (toast) => {
      if (toast.level === "error") {
        failureToastSent = true;
      }
      broadcast(toast);
    };
    const timer = setTimeout(() => {
      if (!settled) {
        timedOut = true;
        failureToastSent = true;
        proc.kill();
        broadcast({
          type: "toast",
          level: "error",
          message: "Sync com o Axis excedeu o tempo limite.",
        });
      }
    }, timeoutMs);

    proc.stdout.on("data", (chunk) => {
      sessionLog.logChunk("stdout", chunk);
      stdoutBuffer += chunk.toString("utf8");
      stdoutBuffer = parseStdoutChunk(stdoutBuffer, onPythonToast);
    });

    proc.stderr.on("data", (chunk) => {
      sessionLog.logChunk("stderr", chunk);
      const text = chunk.toString("utf8").trim();
      if (text) {
        console.error(`[axis-sync] ${text}`);
      }
    });

    proc.on("close", (code) => {
      settled = true;
      clearTimeout(timer);
      if (stdoutBuffer.trim()) {
        parseStdoutChunk(stdoutBuffer + "\n", onPythonToast);
      }
      const exitCode = typeof code === "number" ? code : 1;
      sessionLog.finish(exitCode, { timedOut });
      if (exitCode !== 0 && !failureToastSent) {
        broadcast({
          type: "toast",
          level: "error",
          message: "Falha na sincronização com o Axis.",
        });
      }
      resolve(exitCode);
    });

    proc.on("error", (error) => {
      settled = true;
      clearTimeout(timer);
      sessionLog.finish(1, { spawnError: error.message });
      broadcast({
        type: "toast",
        level: "error",
        message: `Sync indisponível: ${error.message}`,
      });
      resolve(1);
    });
  });
}

function enqueue(taskName, argv) {
  const task = queue
    .then(() => runPythonSync(argv, { taskName }))
    .catch((error) => {
      broadcast({
        type: "toast",
        level: "error",
        message: `${taskName}: ${error.message}`,
      });
      return 1;
    });
  queue = task.then(
    () => {},
    () => {},
  );
  return task;
}

/** Roda antes dos jobs já enfileirados (ex.: startup antes de pulls do carregamento da UI). */
function enqueueAhead(taskName, argv) {
  const task = runPythonSync(argv, { taskName }).catch((error) => {
    broadcast({
      type: "toast",
      level: "error",
      message: `${taskName}: ${error.message}`,
    });
    return 1;
  });
  const tail = queue;
  queue = task.then(
    () => tail,
    () => tail,
  );
  return task;
}

function normalizeSyncRelativePath(raw) {
  return normalizeNotifyRelativePath(raw);
}

function flushCoalesceBucket(taskName) {
  const bucket = coalesceBuckets[taskName];
  if (!bucket) {
    return Promise.resolve(0);
  }
  if (bucket.timer) {
    clearTimeout(bucket.timer);
    bucket.timer = null;
  }
  const paths = [...bucket.paths];
  bucket.paths.clear();
  const waiters = bucket.waiters.splice(0);
  if (!paths.length) {
    for (const resolve of waiters) {
      resolve(0);
    }
    return Promise.resolve(0);
  }
  const argv = [];
  for (const relative of paths) {
    argv.push(bucket.flag, relative);
  }
  const task = enqueue(taskName, argv);
  void task.then(
    (code) => {
      for (const resolve of waiters) {
        resolve(code);
      }
    },
    () => {
      for (const resolve of waiters) {
        resolve(1);
      }
    },
  );
  return task;
}

/**
 * Merge relative paths into one spawn. Awaited callers use flushNow to avoid
 * artificial delay; fire-and-forget callers debounce COALESCE_MS.
 */
function enqueueCoalesced(taskName, relativePaths, { flushNow = false } = {}) {
  const bucket = coalesceBuckets[taskName];
  if (!bucket) {
    return Promise.resolve(0);
  }
  for (const raw of relativePaths || []) {
    const normalized = normalizeSyncRelativePath(raw);
    if (normalized) {
      bucket.paths.add(normalized);
    }
  }
  return new Promise((resolve) => {
    bucket.waiters.push(resolve);
    if (flushNow) {
      void flushCoalesceBucket(taskName);
      return;
    }
    if (bucket.timer) {
      clearTimeout(bucket.timer);
    }
    bucket.timer = setTimeout(() => {
      void flushCoalesceBucket(taskName);
    }, COALESCE_MS);
  });
}

function createAxisSync({ bindHost, dataDir }) {
  const enabled = isSyncEnabled(bindHost);
  syncLogDir = enabled ? resolveAxisSyncLogDir(dataDir) : null;

  function enqueueStartup() {
    if (!enabled || startupQueued) {
      return;
    }
    startupQueued = true;
    enqueueAhead("startup", ["--startup"]);
  }

  function scheduleStartupWhenUiReady() {
    if (!enabled || startupQueued) {
      return;
    }
    setTimeout(() => {
      if (!startupQueued) {
        enqueueStartup();
      }
    }, STARTUP_FALLBACK_MS);
  }

  function onSyncClientConnected(response, { skipReplay = false } = {}) {
    const hadClients = syncClients.size > 0;
    const client = { response };
    syncClients.add(client);
    if (!skipReplay) {
      replayRecentToasts(response);
    }
    if (!hadClients) {
      enqueueStartup();
    }
    return client;
  }

  function enqueuePushRelatives(relativePaths, { flushNow = false } = {}) {
    if (!enabled || !relativePaths?.length) {
      return Promise.resolve(0);
    }
    return enqueueCoalesced("push", relativePaths, { flushNow });
  }

  function enqueuePushRelative(relativePath) {
    return enqueuePushRelatives([relativePath]);
  }


  function dataRelativePath(filePath) {
    if (!filePath || !dataDir) {
      return null;
    }
    const rel = path.relative(dataDir, filePath);
    if (!rel || rel.startsWith("..")) {
      return null;
    }
    return `data/${rel.replace(/\\/g, "/")}`;
  }

  function schedulePullDataFileIfRemoteNewer(filePath) {
    if (!enabled || !filePath) {
      return;
    }
    const relative = dataRelativePath(filePath);
    if (!relative) {
      return;
    }
    void enqueueCoalesced("pull", [relative], { flushNow: false });
  }

  function pullDataFileIfRemoteNewer(filePath) {
    if (!enabled) {
      return Promise.resolve();
    }
    const relative = dataRelativePath(filePath);
    if (!relative) {
      return Promise.resolve();
    }
    // Flush pending pulls immediately so awaited writes are not delayed by debounce.
    return enqueueCoalesced("pull", [relative], { flushNow: true }).then(() => {});
  }

  function enqueuePullIfRemoteNewer(relativePaths) {
    if (!enabled) {
      return { queued: [], done: Promise.resolve(0) };
    }
    const queued = [];
    for (const raw of relativePaths || []) {
      const normalized = normalizeSyncRelativePath(raw);
      if (normalized) {
        queued.push(normalized);
      }
    }
    const done = queued.length
      ? enqueueCoalesced("pull", queued, { flushNow: true })
      : Promise.resolve(0);
    return { queued, done };
  }


  function afterDataFileWrite(filePath) {
    if (!enabled || !filePath || !dataDir) {
      return;
    }
    const relative = dataRelativePath(filePath);
    if (!relative) {
      return;
    }
    enqueuePushRelative(relative);
  }

  function afterPdfExport({ filename, jsonFilename }) {
    if (!enabled) {
      return;
    }
    const paths = ["output/orcamentos-index.json"];
    if (filename) {
      paths.push(`output/${filename}`);
    }
    if (jsonFilename) {
      paths.push(`output/${jsonFilename}`);
    }
    paths.push("export/orcamentos.sqlite");
    void enqueuePushRelatives(paths, { flushNow: true });
  }

  function afterOutputIndexChange() {
    if (!enabled) {
      return;
    }
    void enqueuePushRelatives(["output/orcamentos-index.json", "export/orcamentos.sqlite"], { flushNow: true });
  }

  function attachSyncEventsRoute(request, response) {
    if (!enabled) {
      response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      response.end("Sync desabilitado.");
      return true;
    }

    response.writeHead(200, {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });
    response.write("\n");

    let skipReplay = false;
    try {
      const apiUrl = new URL(request.url || "/api/sync/events", "http://127.0.0.1");
      skipReplay = apiUrl.searchParams.get("skipReplay") === "1";
    } catch {
      skipReplay = false;
    }

    const client = onSyncClientConnected(response, { skipReplay });
    request.on("close", () => {
      syncClients.delete(client);
    });
    return true;
  }

  return {
    enabled,
    enqueueStartup,
    scheduleStartupWhenUiReady,
    enqueuePushRelative,
    enqueuePullIfRemoteNewer,
    schedulePullDataFileIfRemoteNewer,
    pullDataFileIfRemoteNewer,
    afterDataFileWrite,
    afterPdfExport,
    afterOutputIndexChange,
    attachSyncEventsRoute,
  };
}

module.exports = {
  createAxisSync,
  isSyncEnabled,
};
