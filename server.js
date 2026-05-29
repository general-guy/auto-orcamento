const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");

const port = 3000;
const rootDir = __dirname;
const dataDir = path.join(rootDir, "data");
const surgeriesFile = path.join(dataDir, "cirurgias.json");

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
}

function readSurgeries() {
  ensureDataFile();

  try {
    const content = fs.readFileSync(surgeriesFile, "utf8");
    const surgeries = JSON.parse(content);
    return Array.isArray(surgeries) ? surgeries : [];
  } catch {
    return [];
  }
}

function writeSurgeries(surgeries) {
  ensureDataFile();
  fs.writeFileSync(surgeriesFile, `${JSON.stringify(surgeries, null, 2)}\n`, "utf8");
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

async function handleSurgeriesApi(request, response) {
  if (request.method === "GET") {
    sendJson(response, 200, readSurgeries());
    return;
  }

  if (request.method === "POST") {
    const body = await collectRequestBody(request);
    const { value } = JSON.parse(body || "{}");
    const surgery = typeof value === "string" ? value.trim() : "";

    if (!surgery) {
      sendJson(response, 400, { error: "Informe uma cirurgia válida." });
      return;
    }

    const surgeries = readSurgeries();
    const alreadyExists = surgeries.some((item) => normalizeText(item) === normalizeText(surgery));
    const nextSurgeries = alreadyExists ? surgeries : [surgery, ...surgeries].slice(0, 200);

    writeSurgeries(nextSurgeries);
    sendJson(response, 200, nextSurgeries);
    return;
  }

  if (request.method === "DELETE") {
    const body = await collectRequestBody(request);
    const { value } = JSON.parse(body || "{}");
    const surgery = typeof value === "string" ? value.trim() : "";

    if (!surgery) {
      sendJson(response, 400, { error: "Informe uma cirurgia válida." });
      return;
    }

    const nextSurgeries = readSurgeries()
      .filter((item) => normalizeText(item) !== normalizeText(surgery));

    writeSurgeries(nextSurgeries);
    sendJson(response, 200, nextSurgeries);
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
    if (request.url.startsWith("/api/cirurgias")) {
      await handleSurgeriesApi(request, response);
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
