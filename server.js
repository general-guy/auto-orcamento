const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");

const port = 3000;
const rootDir = __dirname;
const dataDir = path.join(rootDir, "data");
const surgeriesFile = path.join(dataDir, "cirurgias.json");
const hospitalsFile = path.join(dataDir, "hospitais.json");
const patientsFile = path.join(dataDir, "pacientes.json");
const technologiesFile = path.join(dataDir, "tecnologias.json");
const paymentsFile = path.join(dataDir, "pagamentos.json");
const guidanceFile = path.join(dataDir, "observacoes.json");

const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".pdf": "application/pdf",
  ".png": "image/png",
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

function collectRequestBody(request) {
  return new Promise((resolve, reject) => {
    let body = "";

    request.on("data", (chunk) => {
      body += chunk;

      if (body.length > 1024 * 32) {
        request.destroy();
        reject(new Error("Request body too large"));
      }
    });

    request.on("end", () => resolve(body));
    request.on("error", reject);
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

  sendJson(response, 405, { error: "Método não permitido." });
}

function serveStaticFile(request, response) {
  const url = new URL(request.url, `http://${request.headers.host}`);
  const requestedPath = decodeURIComponent(url.pathname === "/" ? "/index.html" : url.pathname);
  const filePath = path.normalize(path.join(rootDir, requestedPath));

  if (!filePath.startsWith(rootDir)) {
    response.writeHead(403);
    response.end("Acesso negado.");
    return;
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
    if (request.url.startsWith("/api/shutdown")) {
      if (request.method !== "POST") {
        sendJson(response, 405, { error: "Método não permitido." });
        return;
      }

      sendJson(response, 200, { ok: true });
      setTimeout(() => {
        server.close(() => process.exit(0));
      }, 100);
      return;
    }

    if (request.url.startsWith("/api/cirurgias")) {
      await handleHistoryApi(request, response, surgeriesFile, "uma cirurgia válida");
      return;
    }

    if (request.url.startsWith("/api/hospitais")) {
      await handleHistoryApi(request, response, hospitalsFile, "um hospital válido");
      return;
    }

    if (request.url.startsWith("/api/pacientes")) {
      await handleHistoryApi(request, response, patientsFile, "um paciente válido");
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
      await handleHistoryApi(request, response, guidanceFile, "uma observação válida");
      return;
    }

    serveStaticFile(request, response);
  } catch (error) {
    sendJson(response, 500, { error: error.message });
  }
});

ensureDataFile();
server.listen(port, () => {
  console.log(`Auto Orçamento disponível em http://localhost:${port}`);
});
