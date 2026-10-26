const http = require("node:http");
const path = require("node:path");
const { linuxUsesAxisDataBind } = require("./paths");

const NOTIFY_TIMEOUT_MS = 4500;

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

function toAtlasNotifyPayload(result) {
  if (!result) {
    return undefined;
  }
  if (result.status === "delivered") {
    return {
      level: "ok",
      message: "Atlas avisado; atualização enfileirada.",
    };
  }
  if (result.status === "atlas_offline") {
    return {
      level: "warn",
      message:
        "Atlas inacessível para notify (rede ou app fechado); merge na próxima abertura do .bat.",
    };
  }
  return undefined;
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
      timeout: NOTIFY_TIMEOUT_MS,
    };

    const transport = target.protocol === "https:" ? require("node:https") : http;
    const req = transport.request(requestOptions, (res) => {
      res.resume();
      if (res.statusCode >= 200 && res.statusCode < 300) {
        resolve({ status: "delivered" });
        return;
      }
      if (res.statusCode === 401 || res.statusCode === 403) {
        resolve({ status: "auth_error" });
        return;
      }
      resolve({ status: "atlas_offline" });
    });

    req.on("timeout", () => {
      req.destroy();
      resolve({ status: "atlas_offline" });
    });
    req.on("error", () => {
      resolve({ status: "atlas_offline" });
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
  const result = await postNotifyToAtlas([relative]);
  return toAtlasNotifyPayload(result);
}

async function notifyAtlasRelativePaths(relativePaths) {
  const result = await postNotifyToAtlas(relativePaths);
  return toAtlasNotifyPayload(result);
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

    const queued = axisSync.enqueuePullIfRemoteNewer(rawPaths);
    if (!queued.length) {
      sendJson(response, 400, { error: "Caminho inválido." });
      return;
    }

    sendJson(response, 200, { ok: true, queued });
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
      sendJson(response, 500, { error: error.message });
    });
  });

  server.listen(port, bindHost, () => {
    console.log(`Atlas notify em http://${bindHost}:${port}/api/sync/notify`);
  });

  server.on("error", (error) => {
    console.error(`[atlas-notify] Falha ao abrir ${bindHost}:${port}: ${error.message}`);
  });

  return server;
}

module.exports = {
  readNotifyToken,
  verifyNotifyRequest,
  normalizeNotifyRelativePath,
  filePathToNotifyRelative,
  shouldNotifyAtlasFromAxis,
  toAtlasNotifyPayload,
  notifyAtlasAfterFileWrite,
  notifyAtlasRelativePaths,
  createAtlasNotifyRequestHandler,
  startAtlasNotifyListener,
};
