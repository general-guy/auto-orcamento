const { spawn } = require("node:child_process");
const path = require("node:path");

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

function runPythonSync(argv, { timeoutMs = 4 * 60 * 60 * 1000 } = {}) {
  const script = path.join(resolveLocalAtlasRoot(), "axis", "scripts", "sync_auto_orcamento.py");
  return new Promise((resolve) => {
    const proc = spawn("py", ["-3", script, ...argv], {
      cwd: resolveLocalAtlasRoot(),
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdoutBuffer = "";
    let settled = false;
    const timer = setTimeout(() => {
      if (!settled) {
        proc.kill();
        broadcast({
          type: "toast",
          level: "error",
          message: "Sync com o Axis excedeu o tempo limite.",
        });
      }
    }, timeoutMs);

    proc.stdout.on("data", (chunk) => {
      stdoutBuffer += chunk.toString("utf8");
      stdoutBuffer = parseStdoutChunk(stdoutBuffer, (toast) => broadcast(toast));
    });

    proc.stderr.on("data", (chunk) => {
      const text = chunk.toString("utf8").trim();
      if (text) {
        console.error(`[axis-sync] ${text}`);
      }
    });

    proc.on("close", (code) => {
      settled = true;
      clearTimeout(timer);
      if (stdoutBuffer.trim()) {
        parseStdoutChunk(stdoutBuffer + "\n", (toast) => broadcast(toast));
      }
      const exitCode = typeof code === "number" ? code : 1;
      if (exitCode !== 0) {
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
  queue = queue
    .then(() => runPythonSync(argv))
    .catch((error) => {
      broadcast({
        type: "toast",
        level: "error",
        message: `${taskName}: ${error.message}`,
      });
      return 1;
    });
  return queue;
}

function createAxisSync({ bindHost, dataDir }) {
  const enabled = isSyncEnabled(bindHost);

  function enqueueStartup() {
    if (!enabled) {
      return;
    }
    enqueue("startup", ["--startup"]);
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

  function afterDataFileWrite(filePath) {
    if (!enabled || !filePath || !dataDir) {
      return;
    }
    const rel = path.relative(dataDir, filePath);
    if (!rel || rel.startsWith("..")) {
      return;
    }
    enqueuePushRelative(`data/${rel.replace(/\\/g, "/")}`);
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

    const client = { response };
    syncClients.add(client);
    request.on("close", () => {
      syncClients.delete(client);
    });
    return true;
  }

  return {
    enabled,
    enqueueStartup,
    enqueuePushRelative,
    afterDataFileWrite,
    afterPdfExport,
    attachSyncEventsRoute,
  };
}

module.exports = {
  createAxisSync,
  isSyncEnabled,
};
