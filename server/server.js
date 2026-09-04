const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const auth = require("./auth");
const { freeTcpPort } = require("./port-utils");

const port = 3000;
const bindHost = process.env.BIND_HOST || "127.0.0.1";
const repoRoot = path.join(__dirname, "..");
const webDir = path.join(repoRoot, "web");
const dataDir = path.join(repoRoot, "data");
const outputDir = path.join(repoRoot, "output");
const exportDir = path.join(repoRoot, "export");
const surgeriesFile = path.join(dataDir, "cirurgias.json");
const hospitalsFile = path.join(dataDir, "hospitais.json");
const patientsFile = path.join(dataDir, "pacientes.json");
const technologiesFile = path.join(dataDir, "tecnologias.json");
const paymentsFile = path.join(dataDir, "pagamentos.json");
const guidanceFile = path.join(dataDir, "observacoes.json");
const extrasFile = path.join(dataDir, "extras.json");
const unimedNFile = path.join(dataDir, "unimed-n.json");
const settingsFile = path.join(dataDir, "settings.json");

const ZOOM_MIN = 0.5;
const ZOOM_MAX = 2;
const ZOOM_DEFAULT = 1;

let pdfExportModule = null;
let snapshotOpenDialogModule = null;
let exportSqliteModule = null;

function getPdfExportModule() {
  if (!pdfExportModule) {
    pdfExportModule = require("./pdf-export");
  }

  return pdfExportModule;
}

function getExportSqliteModule() {
  if (!exportSqliteModule) {
    exportSqliteModule = require("./export-sqlite");
  }

  return exportSqliteModule;
}

function consolidateOutputSqliteSafe() {
  try {
    const result = getExportSqliteModule().consolidateOutputToSqlite({
      outputDir,
      exportDir,
      repoRoot,
    });
    const skippedNote = result.skipped > 0 ? ` (${result.skipped} ignorado(s))` : "";
    console.log(
      `SQLite consolidado: ${result.dbRelativeHint} (${result.count} orçamento(s)${skippedNote}).`,
    );
    for (const deliveredPath of result.delivered || []) {
      console.log(`SQLite entregue: ${deliveredPath}`);
    }
    for (const deliverError of result.deliverErrors || []) {
      console.warn(`Falha ao entregar SQLite em ${deliverError.path}: ${deliverError.message}`);
    }
    return result;
  } catch (error) {
    console.error(`Falha ao consolidar output/ em SQLite: ${error.message}`);
    return null;
  }
}

function getSnapshotOpenDialogModule() {
  if (!snapshotOpenDialogModule) {
    snapshotOpenDialogModule = require("./snapshot-open-dialog");
  }

  return snapshotOpenDialogModule;
}

const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".pdf": "application/pdf",
  ".png": "image/png",
  ".otf": "font/otf",
  ".ttf": "font/ttf",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".webmanifest": "application/manifest+json; charset=utf-8",
};

function normalizeText(value) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function ensureDataFile() {
  fs.mkdirSync(dataDir, { recursive: true });

  if (!fs.existsSync(surgeriesFile)) {
    fs.writeFileSync(surgeriesFile, "[]\n", "utf8");
  }

  if (!fs.existsSync(hospitalsFile)) {
    fs.writeFileSync(hospitalsFile, "[]\n", "utf8");
  }

  if (!fs.existsSync(patientsFile)) {
    fs.writeFileSync(patientsFile, "[]\n", "utf8");
  }

  if (!fs.existsSync(technologiesFile)) {
    fs.writeFileSync(technologiesFile, "[]\n", "utf8");
  }

  if (!fs.existsSync(paymentsFile)) {
    fs.writeFileSync(paymentsFile, "[]\n", "utf8");
  }

  if (!fs.existsSync(guidanceFile)) {
    fs.writeFileSync(guidanceFile, "[]\n", "utf8");
  }

  if (!fs.existsSync(extrasFile)) {
    fs.writeFileSync(extrasFile, "[]\n", "utf8");
  }
}

function clampZoom(zoom) {
  const value = Number(zoom);
  if (!Number.isFinite(value)) {
    return ZOOM_DEFAULT;
  }

  const rounded = Math.round(value * 10) / 10;
  return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, rounded));
}

function normalizeSnapshotDir(dir) {
  if (typeof dir !== "string" || !dir.trim()) {
    return null;
  }

  const resolved = path.resolve(dir.trim());
  try {
    return fs.statSync(resolved).isDirectory() ? resolved : null;
  } catch {
    return null;
  }
}

function isUserHomeDirectory(dir) {
  const resolved = path.resolve(dir);
  const home = process.env.USERPROFILE || process.env.HOME;

  return Boolean(home && resolved === path.resolve(home));
}

function getPreferredSnapshotDir() {
  const stored = readSettingsFile();
  const savedDir = normalizeSnapshotDir(stored.lastSnapshotDir);

  if (savedDir && !isUserHomeDirectory(savedDir)) {
    return savedDir;
  }

  return null;
}

function resolveSnapshotDialogDir(preferredDir) {
  ensureOutputDir();

  for (const candidate of [preferredDir, outputDir, repoRoot]) {
    const normalized = normalizeSnapshotDir(candidate);
    if (normalized) {
      return normalized;
    }
  }

  return outputDir;
}

function readSettingsFile() {
  ensureDataFile();

  if (!fs.existsSync(settingsFile)) {
    return {};
  }

  try {
    const content = fs.readFileSync(settingsFile, "utf8");
    const settings = JSON.parse(content);
    return settings && typeof settings === "object" ? settings : {};
  } catch {
    return {};
  }
}

function readSettings() {
  const stored = readSettingsFile();
  const settings = {
    zoom: clampZoom(stored.zoom ?? ZOOM_DEFAULT),
  };
  const lastSnapshotDir = getPreferredSnapshotDir();

  if (lastSnapshotDir) {
    settings.lastSnapshotDir = lastSnapshotDir;
  }

  return settings;
}

function writeSettings(patch = {}) {
  ensureDataFile();
  const stored = readSettingsFile();
  const next = { ...stored };

  if (patch.zoom !== undefined) {
    next.zoom = clampZoom(patch.zoom);
  } else {
    next.zoom = clampZoom(next.zoom ?? ZOOM_DEFAULT);
  }

  if (patch.lastSnapshotDir !== undefined) {
    const dir = normalizeSnapshotDir(patch.lastSnapshotDir);
    if (dir) {
      next.lastSnapshotDir = dir;
    } else {
      delete next.lastSnapshotDir;
    }
  }

  fs.writeFileSync(settingsFile, `${JSON.stringify(next, null, 2)}\n`, "utf8");
  return readSettings();
}

function readJsonList(filePath) {
  ensureDataFile();

  try {
    const content = fs.readFileSync(filePath, "utf8");
    const items = JSON.parse(content);
    return Array.isArray(items) ? items : [];
  } catch {
    return [];
  }
}

function writeJsonList(filePath, items) {
  ensureDataFile();
  fs.writeFileSync(filePath, `${JSON.stringify(items, null, 2)}\n`, "utf8");
}

function sendJson(response, statusCode, data) {
  response.writeHead(statusCode, { "Content-Type": contentTypes[".json"] });
  response.end(JSON.stringify(data));
}

function collectRequestBody(request, maxBytes = 1024 * 32) {
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

function ensureOutputDir() {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Resolve um nome de arquivo para dentro de output/, rejeitando travessia de
// diretórios e qualquer coisa que não seja um .json na própria pasta.
function resolveOutputSnapshotPath(rawName) {
  if (typeof rawName !== "string" || !rawName) {
    return null;
  }

  const name = path.basename(rawName);
  if (name !== rawName || name.includes("/") || name.includes("\\") || name.includes("..")) {
    return null;
  }

  if (path.extname(name).toLowerCase() !== ".json") {
    return null;
  }

  const resolved = path.resolve(outputDir, name);
  const base = path.resolve(outputDir);
  if (resolved !== path.join(base, name) || !resolved.startsWith(base + path.sep)) {
    return null;
  }

  return resolved;
}

function listOutputSnapshots() {
  ensureOutputDir();

  let entries;
  try {
    entries = fs.readdirSync(outputDir, { withFileTypes: true });
  } catch {
    return [];
  }

  return entries
    .filter((entry) => entry.isFile() && path.extname(entry.name).toLowerCase() === ".json")
    .map((entry) => {
      const fullPath = path.join(outputDir, entry.name);
      let modifiedAt = null;
      let size = 0;
      try {
        const stats = fs.statSync(fullPath);
        modifiedAt = stats.mtime.toISOString();
        size = stats.size;
      } catch {
        // arquivo removido entre readdir e stat
      }

      return { name: entry.name, modifiedAt, size };
    })
    .sort((left, right) => String(right.modifiedAt).localeCompare(String(left.modifiedAt)));
}

async function handleSnapshotsApi(request, response, pathname) {
  if (request.method !== "GET") {
    sendJson(response, 405, { error: "Método não permitido." });
    return;
  }

  if (pathname === "/api/snapshots") {
    sendJson(response, 200, { files: listOutputSnapshots() });
    return;
  }

  const match = pathname.match(/^\/api\/snapshots\/(.+)$/);
  const requestedName = match ? decodeURIComponent(match[1]) : "";
  const filePath = resolveOutputSnapshotPath(requestedName);

  if (!filePath) {
    sendJson(response, 400, { error: "Nome de arquivo inválido." });
    return;
  }

  if (!fs.existsSync(filePath)) {
    sendJson(response, 404, { error: "Arquivo não encontrado em output/." });
    return;
  }

  let snapshot;
  try {
    snapshot = JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    sendJson(response, 400, { error: "Arquivo JSON inválido." });
    return;
  }

  sendJson(response, 200, { name: path.basename(filePath), snapshot });
}

async function handleSettingsApi(request, response) {
  if (request.method === "GET") {
    sendJson(response, 200, readSettings());
    return;
  }

  if (request.method === "PUT" || request.method === "POST") {
    const body = await collectRequestBody(request, 4096);
    const payload = JSON.parse(body || "{}");
    const settings = writeSettings(payload);
    sendJson(response, 200, settings);
    return;
  }

  sendJson(response, 405, { error: "Método não permitido." });
}

async function handlePdfExport(request, response) {
  if (request.method !== "POST") {
    sendJson(response, 405, { error: "Método não permitido." });
    return;
  }

  const body = await collectRequestBody(request, 1024 * 1024 * 8);
  const { patientName, pagesHtml, snapshot } = JSON.parse(body || "{}");
  const html = typeof pagesHtml === "string" ? pagesHtml.trim() : "";

  if (!html) {
    sendJson(response, 400, { error: "Informe o conteúdo do documento para exportar." });
    return;
  }

  ensureOutputDir();

  const { buildPdfFilename, renderPdf, resolveUniqueOutputPath, writeBudgetSnapshotJson } =
    getPdfExportModule();
  const createdAt = new Date();
  const firstSurgery = Array.isArray(snapshot?.form?.surgeries)
    ? snapshot.form.surgeries.map((item) => String(item).trim()).find(Boolean) || ""
    : "";
  const filename = buildPdfFilename(patientName, createdAt, firstSurgery);
  const outputPath = resolveUniqueOutputPath(outputDir, filename);
  await renderPdf({
    pagesHtml: html,
    outputPath,
    webDir,
    assetRoot: repoRoot,
  });

  let jsonPath = null;
  if (snapshot && typeof snapshot === "object") {
    jsonPath = writeBudgetSnapshotJson(outputPath, snapshot);
  }

  const responsePayload = {
    filename: path.basename(outputPath),
    path: path.relative(repoRoot, outputPath).replace(/\\/g, "/"),
  };

  if (jsonPath) {
    responsePayload.jsonFilename = path.basename(jsonPath);
    responsePayload.jsonPath = path.relative(repoRoot, jsonPath).replace(/\\/g, "/");
    writeSettings({ lastSnapshotDir: path.dirname(jsonPath) });
  }

  // Espelha todos os JSON de output/ em export/orcamentos.sqlite (outros webapps).
  // Não bloqueia a impressão/PDF se a consolidação falhar.
  const sqliteResult = consolidateOutputSqliteSafe();
  if (sqliteResult) {
    responsePayload.sqlitePath = sqliteResult.dbRelativeHint;
    responsePayload.sqliteCount = sqliteResult.count;
  }

  sendJson(response, 200, responsePayload);
}

async function handleOpenSnapshot(request, response) {
  if (request.method !== "POST") {
    sendJson(response, 405, { error: "Método não permitido." });
    return;
  }

  ensureOutputDir();

  const initialDir = resolveSnapshotDialogDir(getPreferredSnapshotDir());
  let filePath;

  try {
    filePath = getSnapshotOpenDialogModule().pickSnapshotJsonFile(initialDir);
  } catch (error) {
    console.error(`Falha ao abrir seletor (pasta inicial: ${initialDir}):`, error);
    sendJson(response, 500, { error: `Não foi possível abrir o seletor de arquivos: ${error.message}` });
    return;
  }

  if (!filePath) {
    sendJson(response, 200, { cancelled: true });
    return;
  }

  if (!fs.existsSync(filePath)) {
    sendJson(response, 400, { error: "Arquivo não encontrado." });
    return;
  }

  let snapshot;
  try {
    snapshot = JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    sendJson(response, 400, { error: "Arquivo JSON inválido." });
    return;
  }

  writeSettings({ lastSnapshotDir: path.dirname(filePath) });

  sendJson(response, 200, {
    cancelled: false,
    path: filePath,
    snapshot,
  });
}

async function handleHistoryApi(request, response, filePath, itemLabel) {
  if (request.method === "GET") {
    sendJson(response, 200, readJsonList(filePath));
    return;
  }

  if (request.method === "POST") {
    const body = await collectRequestBody(request);
    const { value } = JSON.parse(body || "{}");
    const item = typeof value === "string" ? value.trim() : "";

    if (!item) {
      sendJson(response, 400, { error: `Informe ${itemLabel}.` });
      return;
    }

    const items = readJsonList(filePath);
    const alreadyExists = items.some((existingItem) => normalizeText(existingItem) === normalizeText(item));
    const nextItems = alreadyExists ? items : [item, ...items].slice(0, 200);

    writeJsonList(filePath, nextItems);
    sendJson(response, 200, nextItems);
    return;
  }

  if (request.method === "DELETE") {
    const body = await collectRequestBody(request);
    const { value } = JSON.parse(body || "{}");
    const item = typeof value === "string" ? value.trim() : "";

    if (!item) {
      sendJson(response, 400, { error: `Informe ${itemLabel}.` });
      return;
    }

    const nextItems = readJsonList(filePath)
      .filter((existingItem) => normalizeText(existingItem) !== normalizeText(item));

    writeJsonList(filePath, nextItems);
    sendJson(response, 200, nextItems);
    return;
  }

  sendJson(response, 405, { error: "Método não permitido." });
}

async function handlePaymentApi(request, response) {
  if (request.method === "PUT") {
    const body = await collectRequestBody(request);
    const { items } = JSON.parse(body || "{}");

    if (!Array.isArray(items)) {
      sendJson(response, 400, { error: "Informe uma lista de formas de pagamento." });
      return;
    }

    const normalizedKeys = new Set();
    const nextItems = items
      .map((item) => (typeof item === "string" ? item.trim() : ""))
      .filter((item) => {
        if (!item) {
          return false;
        }

        const key = normalizeText(item);
        if (normalizedKeys.has(key)) {
          return false;
        }

        normalizedKeys.add(key);
        return true;
      })
      .slice(0, 200);

    writeJsonList(paymentsFile, nextItems);
    sendJson(response, 200, nextItems);
    return;
  }

  await handleHistoryApi(request, response, paymentsFile, "uma forma de pagamento válida");
}

async function handleGuidanceApi(request, response) {
  if (request.method === "PUT") {
    const body = await collectRequestBody(request);
    const { items } = JSON.parse(body || "{}");

    if (!Array.isArray(items)) {
      sendJson(response, 400, { error: "Informe uma lista de observações." });
      return;
    }

    const normalizedKeys = new Set();
    const nextItems = items
      .map((item) => (typeof item === "string" ? item.trim() : ""))
      .filter((item) => {
        if (!item) {
          return false;
        }

        const key = normalizeText(item);
        if (normalizedKeys.has(key)) {
          return false;
        }

        normalizedKeys.add(key);
        return true;
      })
      .slice(0, 200);

    writeJsonList(guidanceFile, nextItems);
    sendJson(response, 200, nextItems);
    return;
  }

  await handleHistoryApi(request, response, guidanceFile, "uma observação válida");
}

async function handleExtrasApi(request, response) {
  if (request.method === "PUT") {
    const body = await collectRequestBody(request);
    const { items } = JSON.parse(body || "{}");

    if (!Array.isArray(items)) {
      sendJson(response, 400, { error: "Informe uma lista de extras." });
      return;
    }

    const normalizedKeys = new Set();
    const nextItems = items
      .map((item) => (typeof item === "string" ? item.trim() : ""))
      .filter((item) => {
        if (!item) {
          return false;
        }

        const key = normalizeText(item);
        if (normalizedKeys.has(key)) {
          return false;
        }

        normalizedKeys.add(key);
        return true;
      })
      .slice(0, 200);

    writeJsonList(extrasFile, nextItems);
    sendJson(response, 200, nextItems);
    return;
  }

  await handleHistoryApi(request, response, extrasFile, "um extra válido");
}

async function handlePatientsApi(request, response) {
  if (request.method === "PUT") {
    const body = await collectRequestBody(request);
    const { items } = JSON.parse(body || "{}");

    if (!Array.isArray(items)) {
      sendJson(response, 400, { error: "Informe uma lista de pacientes." });
      return;
    }

    const normalizedKeys = new Set();
    const nextItems = items
      .map((item) => (typeof item === "string" ? item.trim() : ""))
      .filter((item) => {
        if (!item) {
          return false;
        }

        const key = normalizeText(item);
        if (normalizedKeys.has(key)) {
          return false;
        }

        normalizedKeys.add(key);
        return true;
      })
      .slice(0, 200);

    writeJsonList(patientsFile, nextItems);
    sendJson(response, 200, nextItems);
    return;
  }

  await handleHistoryApi(request, response, patientsFile, "um paciente válido");
}

async function handleSurgeriesApi(request, response) {
  if (request.method === "PUT") {
    const body = await collectRequestBody(request);
    const { items } = JSON.parse(body || "{}");

    if (!Array.isArray(items)) {
      sendJson(response, 400, { error: "Informe uma lista de cirurgias." });
      return;
    }

    const normalizedKeys = new Set();
    const nextItems = items
      .map((item) => (typeof item === "string" ? item.trim() : ""))
      .filter((item) => {
        if (!item) {
          return false;
        }

        const key = normalizeText(item);
        if (normalizedKeys.has(key)) {
          return false;
        }

        normalizedKeys.add(key);
        return true;
      })
      .slice(0, 200);

    writeJsonList(surgeriesFile, nextItems);
    sendJson(response, 200, nextItems);
    return;
  }

  await handleHistoryApi(request, response, surgeriesFile, "uma cirurgia válida");
}

async function handleHospitalsApi(request, response) {
  if (request.method === "PUT") {
    const body = await collectRequestBody(request);
    const { items } = JSON.parse(body || "{}");

    if (!Array.isArray(items)) {
      sendJson(response, 400, { error: "Informe uma lista de hospitais." });
      return;
    }

    const normalizedKeys = new Set();
    const nextItems = items
      .map((item) => (typeof item === "string" ? item.trim() : ""))
      .filter((item) => {
        if (!item) {
          return false;
        }

        const key = normalizeText(item);
        if (normalizedKeys.has(key)) {
          return false;
        }

        normalizedKeys.add(key);
        return true;
      })
      .slice(0, 200);

    writeJsonList(hospitalsFile, nextItems);
    sendJson(response, 200, nextItems);
    return;
  }

  await handleHistoryApi(request, response, hospitalsFile, "um hospital válido");
}

async function handleUnimedNApi(request, response) {
  if (request.method === "GET") {
    sendJson(response, 200, readJsonList(unimedNFile));
    return;
  }

  if (request.method === "POST") {
    const body = await collectRequestBody(request);
    const { nome, valor } = JSON.parse(body || "{}");
    const procedure = typeof nome === "string" ? nome.trim() : "";

    if (!procedure) {
      sendJson(response, 400, { error: "Informe um procedimento Unimed N válido." });
      return;
    }

    const item = {
      nome: procedure,
      valor: typeof valor === "string" ? valor.trim() : "",
    };
    const items = readJsonList(unimedNFile)
      .filter((existingItem) => normalizeText(existingItem.nome || existingItem) !== normalizeText(item.nome));
    const nextItems = [item, ...items].slice(0, 200);

    writeJsonList(unimedNFile, nextItems);
    sendJson(response, 200, nextItems);
    return;
  }

  if (request.method === "DELETE") {
    const body = await collectRequestBody(request);
    const { nome, value } = JSON.parse(body || "{}");
    const procedure = typeof nome === "string" ? nome.trim() : typeof value === "string" ? value.trim() : "";

    if (!procedure) {
      sendJson(response, 400, { error: "Informe um procedimento Unimed N válido." });
      return;
    }

    const nextItems = readJsonList(unimedNFile)
      .filter((existingItem) => normalizeText(existingItem.nome || existingItem) !== normalizeText(procedure));

    writeJsonList(unimedNFile, nextItems);
    sendJson(response, 200, nextItems);
    return;
  }

  if (request.method === "PUT") {
    const body = await collectRequestBody(request);
    const { items } = JSON.parse(body || "{}");

    if (!Array.isArray(items)) {
      sendJson(response, 400, { error: "Informe uma lista de procedimentos Unimed N." });
      return;
    }

    const normalizedKeys = new Set();
    const nextItems = items
      .map((item) => {
        const nome = typeof item?.nome === "string" ? item.nome.trim() : "";
        const valor = typeof item?.valor === "string" ? item.valor.trim() : "";
        return { nome, valor };
      })
      .filter((item) => {
        if (!item.nome) {
          return false;
        }

        const key = normalizeText(item.nome);
        if (normalizedKeys.has(key)) {
          return false;
        }

        normalizedKeys.add(key);
        return true;
      })
      .slice(0, 200);

    writeJsonList(unimedNFile, nextItems);
    sendJson(response, 200, nextItems);
    return;
  }

  sendJson(response, 405, { error: "Método não permitido." });
}

async function handleTechnologyApi(request, response) {
  if (request.method === "GET") {
    sendJson(response, 200, readJsonList(technologiesFile));
    return;
  }

  if (request.method === "POST") {
    const body = await collectRequestBody(request);
    const { nome, valor } = JSON.parse(body || "{}");
    const technology = typeof nome === "string" ? nome.trim() : "";

    if (!technology) {
      sendJson(response, 400, { error: "Informe uma tecnologia válida." });
      return;
    }

    const item = {
      nome: technology,
      valor: typeof valor === "string" ? valor.trim() : "",
    };
    const items = readJsonList(technologiesFile)
      .filter((existingItem) => normalizeText(existingItem.nome || existingItem) !== normalizeText(item.nome));
    const nextItems = [item, ...items].slice(0, 200);

    writeJsonList(technologiesFile, nextItems);
    sendJson(response, 200, nextItems);
    return;
  }

  if (request.method === "DELETE") {
    const body = await collectRequestBody(request);
    const { nome, value } = JSON.parse(body || "{}");
    const technology = typeof nome === "string" ? nome.trim() : typeof value === "string" ? value.trim() : "";

    if (!technology) {
      sendJson(response, 400, { error: "Informe uma tecnologia válida." });
      return;
    }

    const nextItems = readJsonList(technologiesFile)
      .filter((existingItem) => normalizeText(existingItem.nome || existingItem) !== normalizeText(technology));

    writeJsonList(technologiesFile, nextItems);
    sendJson(response, 200, nextItems);
    return;
  }

  if (request.method === "PUT") {
    const body = await collectRequestBody(request);
    const { items } = JSON.parse(body || "{}");

    if (!Array.isArray(items)) {
      sendJson(response, 400, { error: "Informe uma lista de tecnologias." });
      return;
    }

    const normalizedKeys = new Set();
    const nextItems = items
      .map((item) => {
        const nome = typeof item?.nome === "string" ? item.nome.trim() : "";
        const valor = typeof item?.valor === "string" ? item.valor.trim() : "";
        return { nome, valor };
      })
      .filter((item) => {
        if (!item.nome) {
          return false;
        }

        const key = normalizeText(item.nome);
        if (normalizedKeys.has(key)) {
          return false;
        }

        normalizedKeys.add(key);
        return true;
      })
      .slice(0, 200);

    writeJsonList(technologiesFile, nextItems);
    sendJson(response, 200, nextItems);
    return;
  }

  sendJson(response, 405, { error: "Método não permitido." });
}

const repoRootUrlPrefixes = ["assets", "data", "output"];

function resolveStaticPath(requestedPath) {
  const cleanPath = requestedPath.replace(/^\/+/, "").replace(/\\/g, "/");
  const urlPath = path
    .posix
    .normalize(cleanPath)
    .replace(/^(\.\.(\/|$))+/, "")
    .replace(/^\/+/, "");

  const topSegment = urlPath.split("/")[0];
  const baseDir = repoRootUrlPrefixes.includes(topSegment) ? repoRoot : webDir;
  const filePath = path.normalize(path.join(baseDir, urlPath));

  if (!filePath.startsWith(baseDir)) {
    return null;
  }

  return { filePath, urlPath };
}

function serveStaticFile(request, response) {
  const url = new URL(request.url, `http://${request.headers.host}`);
  const requestedPath = decodeURIComponent(url.pathname === "/" ? "/index.html" : url.pathname);
  const resolved = resolveStaticPath(requestedPath);

  if (!resolved) {
    response.writeHead(403);
    response.end("Acesso negado.");
    return;
  }

  const { filePath, urlPath } = resolved;
  if (auth.isAuthEnabled()) {
    if (urlPath.startsWith("output/")) {
      response.writeHead(403);
      response.end("Acesso negado.");
      return;
    }

    if (
      urlPath.startsWith("data/") &&
      urlPath !== "data/tabelas-hospitalares.json" &&
      urlPath !== "data/tabela-implantes.json"
    ) {
      response.writeHead(403);
      response.end("Acesso negado.");
      return;
    }
  }

  fs.readFile(filePath, (error, content) => {
    if (error) {
      response.writeHead(404);
      response.end("Arquivo não encontrado.");
      return;
    }

    const extension = path.extname(filePath);
    response.writeHead(200, {
      "Content-Type": contentTypes[extension] || "application/octet-stream",
    });
    response.end(content);
  });
}

const server = http.createServer(async (request, response) => {
  try {
    const authHandled = await auth.handleRequest(request, response, {
      dataDir,
      sendJson,
      collectRequestBody,
    });

    if (authHandled) {
      return;
    }

    if (request.url.startsWith("/api/shutdown")) {
      if (request.method !== "POST") {
        sendJson(response, 405, { error: "Método não permitido." });
        return;
      }

      if (!auth.canShutdown(request)) {
        sendJson(response, 403, { error: "Apenas o administrador pode encerrar o servidor." });
        return;
      }

      sendJson(response, 200, { ok: true });
      setTimeout(() => {
        server.close(() => process.exit(0));
      }, 100);
      return;
    }

    if (request.url.startsWith("/api/cirurgias")) {
      await handleSurgeriesApi(request, response);
      return;
    }

    if (request.url.startsWith("/api/hospitais")) {
      await handleHospitalsApi(request, response);
      return;
    }

    if (request.url.startsWith("/api/unimed-n")) {
      await handleUnimedNApi(request, response);
      return;
    }

    if (request.url.startsWith("/api/pacientes")) {
      await handlePatientsApi(request, response);
      return;
    }

    if (request.url.startsWith("/api/tecnologias")) {
      await handleTechnologyApi(request, response);
      return;
    }

    if (request.url.startsWith("/api/pagamentos")) {
      await handlePaymentApi(request, response);
      return;
    }

    if (request.url.startsWith("/api/observacoes")) {
      await handleGuidanceApi(request, response);
      return;
    }

    if (request.url.startsWith("/api/extras")) {
      await handleExtrasApi(request, response);
      return;
    }

    if (request.url.startsWith("/api/settings")) {
      await handleSettingsApi(request, response);
      return;
    }

    if (request.url.startsWith("/api/pdf")) {
      await handlePdfExport(request, response);
      return;
    }

    if (request.url.startsWith("/api/snapshots")) {
      // Lista/leitura somente-leitura de output/ (seguro para acesso remoto).
      const snapshotsPath = new URL(request.url, "http://localhost").pathname;
      await handleSnapshotsApi(request, response, snapshotsPath);
      return;
    }

    if (request.url.startsWith("/api/open-snapshot")) {
      // O seletor nativo abre no PC servidor; nunca deve ser disparado por um
      // cliente remoto (Funnel). O frontend remoto usa a caixa dedicada de output/.
      if (auth.isAuthEnabled() && auth.isRemoteRequest(request)) {
        sendJson(response, 403, {
          error: "Seletor nativo indisponível no acesso remoto. Use a lista de orçamentos salvos.",
        });
        return;
      }

      await handleOpenSnapshot(request, response);
      return;
    }

    const apiPath = new URL(request.url, "http://localhost").pathname;
    if (apiPath.startsWith("/api/")) {
      sendJson(response, 404, {
        error: "Endpoint não encontrado. Reinicie o app com abrir-auto-orcamento.bat.",
      });
      return;
    }

    serveStaticFile(request, response);
  } catch (error) {
    sendJson(response, 500, { error: error.message });
  }
});

async function startServer() {
  ensureDataFile();
  ensureOutputDir();
  auth.ensureBootstrapAdmin(dataDir);
  await freeTcpPort(port);
  server.listen(port, bindHost, () => {
    console.log(`Auto Orçamento disponível em http://${bindHost}:${port}`);

    if (auth.isAuthEnabled()) {
      console.log("Acesso remoto com autenticação ativado (AUTH_ENABLED).");
    }

    // Espelho SQLite alinhado a output/ em cada abertura do app (além da impressão).
    consolidateOutputSqliteSafe();
  });
}

void startServer();
