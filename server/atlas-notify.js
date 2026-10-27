const http = require("node:http");
const path = require("node:path");
const { linuxUsesAxisDataBind } = require("./paths");
const { freeTcpPortSync } = require("./port-utils");

const NOTIFY_FIRST_BYTE_MS = 12000;
const NOTIFY_SYNC_MS = 15 * 60 * 1000;

const notifyToastClients = new Set();

function readNotifyToken() {
  return String(process.env.AUTO_ORCAMENTO_ATLAS_NOTIFY_TOKEN || "").trim();
}

function verifyNotifyRequest(request) {
  const expected = readNotifyToken();
  if (!expected) {
    return false;
  }
  const direct = String(request.headers["x-auto-orcamento-notify-token"] || "").trim();
  if (direct && direct === expected) {
    return true;
  }
  const auth = String(request.headers.authorization || "").trim();
  if (auth.toLowerCase().startsWith("bearer ")) {
    return auth.slice(7).trim() === expected;
  }
  return false;
}

function normalizeNotifyRelativePath(raw) {
  const normalized = path.posix
    .normalize(String(raw || "").replace(/\\/g, "/"))
    .replace(/^\/+/, "");
  if (!normalized || normalized === "." || normalized.startsWith("..") || normalized.includes("/..")) {
    return null;
  }
  if (normalized.startsWith("data/")) {
    if (!normalized.endsWith(".json")) {
      return null;
    }
    return normalized;
  }
  if (normalized.startsWith("output/")) {
    const base = path.posix.basename(normalized);
    const ext = path.posix.extname(base).toLowerCase();
    if (ext !== ".json" && ext !== ".pdf") {
      return null;
    }
    if (base.includes("..")) {
      return null;
    }
    return normalized;
  }
  if (normalized === "export/orcamentos.sqlite") {
    return normalized;
  }
  return null;
}

function filePathToNotifyRelative(filePath, roots) {
  if (!filePath || !roots) {
    return null;
  }
  const pairs = [
    ["data", roots.dataDir],
    ["output", roots.outputDir],
    ["export", roots.exportDir],
  ];
  for (const [prefix, rootDir] of pairs) {
    if (!rootDir) {
      continue;
    }
    const rel = path.relative(rootDir, filePath);
    if (!rel || rel.startsWith("..")) {
      continue;
    }
    const posix = `${prefix}/${rel.replace(/\\/g, "/")}`;
    return normalizeNotifyRelativePath(posix);
  }
  return null;
}

function shouldNotifyAtlasFromAxis() {
  return linuxUsesAxisDataBind() && Boolean(readNotifyToken()) && Boolean(readNotifyUrl());
}

function readNotifyUrl() {
  return String(process.env.AUTO_ORCAMENTO_ATLAS_NOTIFY_URL || "").trim();
}

function toastFromNotifyEvent(event) {
  if (!event || typeof event !== "object") {
    return null;
  }
  if (event.phase === "received" && event.ok === true) {
    return {
      level: "ok",
      phase: "notify",
      message: "Atlas recebeu; sincronização em andamento.",
    };
  }
  if (event.phase === "synced" && event.ok === true) {
    return {
      level: "ok",
      phase: "notify",
      message: "Sincronização com o Atlas concluída.",
    };
  }
  if (event.phase === "synced") {
    return {
      level: "error",
      phase: "notify",
      message: event.message || "A sincronização no Atlas falhou.",
    };
  }
  return null;
}

function publishNotifyToast(toast) {
  if (!toast?.message) {
    return;
  }
  const event = {
    type: "toast",
    level: toast.level || "ok",
    message: toast.message,
    phase: toast.phase || "notify",
  };
  const payload = `data: ${JSON.stringify(event)}\n\n`;
  for (const client of notifyToastClients) {
    try {
      client.response.write(payload);
    } catch {
      notifyToastClients.delete(client);
    }
  }
}

function attachNotifyToastRoute(request, response) {
  response.writeHead(200, {
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });
  response.write("\n");

  const client = { response };
  notifyToastClients.add(client);
  const ping = setInterval(() => {
    try {
      response.write(": ping\n\n");
    } catch {
      clearInterval(ping);
    }
  }, 20000);
  request.on("close", () => {
    clearInterval(ping);
    notifyToastClients.delete(client);
  });
}

function consumeNotifyLines(buffer, onEvent) {
  const lines = buffer.split("\n");
  const rest = lines.pop() ?? "";
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      continue;
    }
    try {
      onEvent(JSON.parse(trimmed));
    } catch {
      // linha incompleta ou lixo
    }
  }
  return rest;
}

async function postNotifyToAtlas(relativePaths) {
  const urlText = readNotifyUrl();
  const token = readNotifyToken();
  if (!shouldNotifyAtlasFromAxis() || !urlText || !token) {
    return null;
  }

  const paths = [];
  for (const raw of relativePaths) {
    const normalized = normalizeNotifyRelativePath(raw);
    if (normalized) {
      paths.push(normalized);
    }
  }
  if (!paths.length) {
    return null;
  }

  let target;
  try {
    target = new URL(urlText);
  } catch {
    return { status: "misconfigured" };
  }

  const body = JSON.stringify(
    paths.length === 1 ? { relativePath: paths[0] } : { relativePaths: paths },
  );

  return new Promise((resolve) => {
    const requestOptions = {
      method: "POST",
      hostname: target.hostname,
      port: target.port || (target.protocol === "https:" ? 443 : 80),
      path: `${target.pathname}${target.search}`,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Length": Buffer.byteLength(body),
        "X-Auto-Orcamento-Notify-Token": token,
      },
    };

    let sawEvent = false;
    let settled = false;
    let interruptToastSent = false;
    const finish = (status) => {
      if (settled) {
        return;
      }
      settled = true;
      resolve({ status });
    };
    const warnInterrupted = () => {
      if (!sawEvent || interruptToastSent) {
        return;
      }
      interruptToastSent = true;
      publishNotifyToast({
        level: "warn",
        phase: "notify",
        message: "A conexão com o Atlas caiu antes de concluir a sincronização.",
      });
    };

    const transport = target.protocol === "https:" ? require("node:https") : http;
    const req = transport.request(requestOptions, (res) => {
      if (res.statusCode === 401 || res.statusCode === 403) {
        res.resume();
        finish("auth_error");
        return;
      }
      if (res.statusCode < 200 || res.statusCode >= 300) {
        res.resume();
        finish("atlas_offline");
        return;
      }

      let pending = "";
      const onEvent = (event) => {
        const toast = toastFromNotifyEvent(event);
        if (!toast) {
          return;
        }
        sawEvent = true;
        req.setTimeout(NOTIFY_SYNC_MS);
        publishNotifyToast(toast);
      };

      res.on("data", (chunk) => {
        pending = consumeNotifyLines(pending + chunk.toString("utf8"), onEvent);
      });
      res.on("end", () => {
        const tail = pending.trim();
        if (tail) {
          try {
            onEvent(JSON.parse(tail));
          } catch {
            // corpo legado ilegível
          }
        }
        finish(sawEvent ? "delivered" : "atlas_offline");
      });
    });

    req.setTimeout(NOTIFY_FIRST_BYTE_MS);
    req.on("timeout", () => {
      req.destroy();
      warnInterrupted();
      finish(sawEvent ? "interrupted" : "atlas_offline");
    });
    req.on("error", () => {
      warnInterrupted();
      finish(sawEvent ? "interrupted" : "atlas_offline");
    });
    req.write(body);
    req.end();
  });
}

async function notifyAtlasAfterFileWrite(filePath, roots) {
  const relative = filePathToNotifyRelative(filePath, roots);
  if (!relative) {
    return undefined;
  }
  await postNotifyToAtlas([relative]);
  return undefined;
}

async function notifyAtlasRelativePaths(relativePaths) {
  await postNotifyToAtlas(relativePaths);
  return undefined;
}

function collectRequestBody(request, maxBytes = 4096) {
  return new Promise((resolve, reject) => {
    let body = "";
    request.on("data", (chunk) => {
      body += chunk;
      if (body.length > maxBytes) {
        request.destroy();
        reject(new Error("Request body too large"));
      }
    });
    request.on("end", () => resolve(body));
    request.on("error", reject);
  });
}

function sendJson(response, statusCode, data) {
  const payload = JSON.stringify(data);
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(payload),
  });
  response.end(payload);
}

function createAtlasNotifyRequestHandler({ axisSync }) {
  return async function handleAtlasNotifyRequest(request, response) {
    if (request.method !== "POST") {
      sendJson(response, 405, { error: "Método não permitido." });
      return;
    }

    if (!axisSync?.enabled) {
      sendJson(response, 403, { error: "Notify disponível só no Atlas com sync ativo." });
      return;
    }

    if (!readNotifyToken()) {
      sendJson(response, 503, { error: "Notify não configurado no Atlas." });
      return;
    }

    if (!verifyNotifyRequest(request)) {
      sendJson(response, 401, { error: "Token inválido." });
      return;
    }

    let payload = {};
    try {
      const raw = await collectRequestBody(request);
      payload = JSON.parse(raw || "{}");
    } catch {
      sendJson(response, 400, { error: "JSON inválido." });
      return;
    }

    const rawPaths = [];
    if (typeof payload.relativePath === "string") {
      rawPaths.push(payload.relativePath);
    }
    if (Array.isArray(payload.relativePaths)) {
      rawPaths.push(...payload.relativePaths);
    }

    const pull = axisSync.enqueuePullIfRemoteNewer(rawPaths) || {};
    const queued = Array.isArray(pull) ? pull : pull.queued || [];
    const done = Array.isArray(pull) ? Promise.resolve(0) : pull.done;
    if (!queued.length) {
      sendJson(response, 400, { error: "Caminho inválido." });
      return;
    }

    response.writeHead(200, {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });
    if (response.socket) {
      response.socket.setNoDelay(true);
    }

    const writeEvent = (event) => {
      if (response.writableEnded || response.destroyed) {
        return;
      }
      try {
        response.write(`${JSON.stringify(event)}\n`);
      } catch {
        // cliente Axis desconectou
      }
    };

    writeEvent({ phase: "received", ok: true, queued });
    let code = 1;
    try {
      code = await done;
    } catch (error) {
      writeEvent({
        phase: "synced",
        ok: false,
        message: error?.message || "A sincronização no Atlas falhou.",
      });
      response.end();
      return;
    }

    writeEvent({
      phase: "synced",
      ok: code === 0,
      ...(code === 0 ? {} : { message: "A sincronização no Atlas falhou." }),
    });
    try {
      response.end();
    } catch {
      // cliente Axis desconectou
    }
  };
}

function startAtlasNotifyListener({ axisSync, handler }) {
  const token = readNotifyToken();
  const bindHost = String(process.env.AUTO_ORCAMENTO_ATLAS_NOTIFY_BIND_HOST || "").trim();
  const port = Number(process.env.AUTO_ORCAMENTO_ATLAS_NOTIFY_PORT || 3010);

  if (!axisSync?.enabled || !token || !bindHost) {
    return null;
  }

  if (!Number.isFinite(port) || port < 1 || port > 65535) {
    console.warn("[atlas-notify] AUTO_ORCAMENTO_ATLAS_NOTIFY_PORT inválida; listener omitido.");
    return null;
  }

  const server = http.createServer((request, response) => {
    const pathname = new URL(request.url || "/", "http://localhost").pathname;
    if (pathname !== "/api/sync/notify") {
      sendJson(response, 404, { error: "Não encontrado." });
      return;
    }
    void handler(request, response).catch((error) => {
      if (response.headersSent) {
        response.destroy();
        return;
      }
      sendJson(response, 500, { error: error.message });
    });
  });

  const onListening = () => {
    console.log(`Atlas notify em http://${bindHost}:${port}/api/sync/notify`);
  };

  let retried = false;
  server.on("error", (error) => {
    if (error.code === "EADDRINUSE" && !retried) {
      retried = true;
      freeTcpPortSync(port);
      setTimeout(() => {
        server.listen(port, bindHost, onListening);
      }, 300);
      return;
    }
    console.error(`[atlas-notify] Falha ao abrir ${bindHost}:${port}: ${error.message}`);
  });

  freeTcpPortSync(port);
  server.listen(port, bindHost, onListening);

  return server;
}

module.exports = {
  readNotifyToken,
  verifyNotifyRequest,
  normalizeNotifyRelativePath,
  filePathToNotifyRelative,
  shouldNotifyAtlasFromAxis,
  toastFromNotifyEvent,
  publishNotifyToast,
  attachNotifyToastRoute,
  notifyAtlasAfterFileWrite,
  notifyAtlasRelativePaths,
  createAtlasNotifyRequestHandler,
  startAtlasNotifyListener,
};
