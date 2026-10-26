const fs = require("node:fs");
const {
  isCatalogV2,
  readCatalogFile,
  writeCatalogFile,
  toApiPayload,
  upsertEntry,
  deleteEntry,
  replaceActiveOrder,
} = require("./catalog-v2");

async function readCatalogFresh(filePath, pullFn) {
  await pullFn(filePath);
  if (!fs.existsSync(filePath)) {
    return readCatalogFile(filePath);
  }

  let parsed;
  try {
    parsed = JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    parsed = [];
  }

  if (!isCatalogV2(parsed)) {
    const migrated = readCatalogFile(filePath);
    writeCatalogFile(filePath, migrated);
    return migrated;
  }

  return readCatalogFile(filePath);
}

function writeCatalog(filePath, doc, afterWrite) {
  writeCatalogFile(filePath, doc);
  afterWrite(filePath);
}

async function handleCatalogApi(request, response, filePath, pullFn, afterWrite, options) {
  const {
    invalidLabelError = "Informe um valor válido.",
    listError = "Informe uma lista válida.",
    valued = false,
  } = options;

  if (request.method === "GET") {
    const doc = await readCatalogFresh(filePath, pullFn);
    response.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
    response.end(JSON.stringify(toApiPayload(doc)));
    return;
  }

  if (request.method === "PUT") {
    const body = await collectRequestBody(request);
    const { items } = JSON.parse(body || "{}");
    const doc = await readCatalogFresh(filePath, pullFn);
    const { doc: next, error } = replaceActiveOrder(doc, items, Date.now(), listError);

    if (error) {
      response.writeHead(400, { "Content-Type": "application/json; charset=utf-8" });
      response.end(JSON.stringify({ error }));
      return;
    }

    writeCatalog(filePath, next, afterWrite);
    response.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
    response.end(JSON.stringify(toApiPayload(next)));
    return;
  }

  if (request.method === "POST") {
    const body = await collectRequestBody(request);
    const payload = JSON.parse(body || "{}");
    const id = typeof payload.id === "string" ? payload.id.trim() : "";
    const value = typeof payload.value === "string" ? payload.value.trim() : "";
    const label =
      typeof payload.label === "string"
        ? payload.label.trim()
        : typeof payload.nome === "string"
          ? payload.nome.trim()
          : value;
    const valor = typeof payload.valor === "string" ? payload.valor.trim() : "";

    if (!label) {
      response.writeHead(400, { "Content-Type": "application/json; charset=utf-8" });
      response.end(JSON.stringify({ error: invalidLabelError }));
      return;
    }

    const doc = await readCatalogFresh(filePath, pullFn);
    const upsertPayload = { id: id || undefined, label };
    if (valued || valor) {
      upsertPayload.valor = valor;
    }
    const { doc: next, error } = upsertEntry(doc, upsertPayload, Date.now(), invalidLabelError);

    if (error) {
      response.writeHead(400, { "Content-Type": "application/json; charset=utf-8" });
      response.end(JSON.stringify({ error }));
      return;
    }

    writeCatalog(filePath, next, afterWrite);
    response.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
    response.end(JSON.stringify(toApiPayload(next)));
    return;
  }

  if (request.method === "DELETE") {
    const body = await collectRequestBody(request);
    const payload = JSON.parse(body || "{}");
    const id = typeof payload.id === "string" ? payload.id.trim() : "";
    const value =
      typeof payload.value === "string"
        ? payload.value.trim()
        : typeof payload.nome === "string"
          ? payload.nome.trim()
          : "";

    const doc = await readCatalogFresh(filePath, pullFn);
    const { doc: next } = deleteEntry(doc, { id: id || undefined, value: value || undefined });
    writeCatalog(filePath, next, afterWrite);
    response.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
    response.end(JSON.stringify(toApiPayload(next)));
    return;
  }

  response.writeHead(405, { "Content-Type": "application/json; charset=utf-8" });
  response.end(JSON.stringify({ error: "Método não permitido." }));
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

module.exports = {
  readCatalogFresh,
  writeCatalog,
  handleCatalogApi,
};
