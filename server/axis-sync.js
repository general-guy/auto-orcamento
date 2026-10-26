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

  function onSyncClientConnected(response) {
    const hadClients = syncClients.size > 0;
    const client = { response };
    syncClients.add(client);
    replayRecentToasts(response);
    if (!hadClients) {
      enqueueStartup();
    }
    return client;
  }

  function enqueuePushRelatives(relativePaths) {
    if (!enabled || !relativePaths?.length) {
      return;
    }
    const argv = [];
    for (const relativePath of relativePaths) {
      const normalized = String(relativePath).replace(/\\/g, "/").replace(/^\/+/, "");
      if (normalized) {
        argv.push("--push-relative", normalized);
      }
    }
    if (argv.length) {
      enqueue("push", argv);
    }
  }

  function enqueuePushRelative(relativePath) {
    enqueuePushRelatives([relativePath]);
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

  function pullDataFileIfRemoteNewer(filePath) {
    if (!enabled) {
      return Promise.resolve();
    }
    const relative = dataRelativePath(filePath);
    if (!relative) {
      return Promise.resolve();
    }
    return enqueue("pull", ["--pull-if-remote-newer", relative]).then(() => {});
  }

  function enqueuePullIfRemoteNewer(relativePaths) {
    if (!enabled) {
      return [];
    }
    const queued = [];
    const argv = [];
    for (const raw of relativePaths) {
      const normalized = normalizeNotifyRelativePath(raw);
      if (!normalized) {
        continue;
      }
      queued.push(normalized);
      argv.push("--pull-if-remote-newer", normalized);
    }
    if (argv.length) {
      enqueue("pull", argv);
    }
    return queued;
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
    const paths = [];
    if (filename) {
      paths.push(`output/${filename}`);
    }
    if (jsonFilename) {
      paths.push(`output/${jsonFilename}`);
    }
    paths.push("export/orcamentos.sqlite");
    enqueuePushRelatives(paths);
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

    const client = onSyncClientConnected(response);
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
    pullDataFileIfRemoteNewer,
    afterDataFileWrite,
    afterPdfExport,
    attachSyncEventsRoute,
  };
}

module.exports = {
  createAxisSync,
  isSyncEnabled,
};
