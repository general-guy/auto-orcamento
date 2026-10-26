const crypto = require("node:crypto");
const fs = require("node:fs");

const SCHEMA_VERSION = 2;
const MAX_ACTIVE = 200;

const EMPTY_CATALOG = {
  schemaVersion: SCHEMA_VERSION,
  items: [],
};

function normalizeText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function isCatalogV2(parsed) {
  return (
    parsed &&
    typeof parsed === "object" &&
    !Array.isArray(parsed) &&
    parsed.schemaVersion === SCHEMA_VERSION &&
    Array.isArray(parsed.items)
  );
}

function legacyItemToEntry(item, migrationTime, index) {
  if (typeof item === "string") {
    const label = item.trim();
    if (!label) {
      return null;
    }
    return {
      id: crypto.randomUUID(),
      label,
      mtime: migrationTime + index,
      deleted: false,
    };
  }

  if (item && typeof item === "object") {
    const label = String(item.label || item.nome || "").trim();
    if (!label) {
      return null;
    }
    const valor = typeof item.valor === "string" ? item.valor.trim() : "";
    const entry = {
      id: crypto.randomUUID(),
      label,
      mtime: migrationTime + index,
      deleted: false,
    };
    if (valor) {
      entry.valor = valor;
    }
    return entry;
  }

  return null;
}

function migrateLegacyToV2(parsed, migrationTime = Date.now()) {
  const rows = Array.isArray(parsed) ? parsed : [];
  const items = rows
    .map((entry, index) => legacyItemToEntry(entry, migrationTime, index))
    .filter(Boolean);
  return { schemaVersion: SCHEMA_VERSION, items };
}

function parseCatalogRaw(content) {
  if (!content || !content.trim()) {
    return { ...EMPTY_CATALOG };
  }

  let parsed;
  try {
    parsed = JSON.parse(content);
  } catch {
    return { ...EMPTY_CATALOG };
  }

  if (isCatalogV2(parsed)) {
    return parsed;
  }

  if (Array.isArray(parsed)) {
    return migrateLegacyToV2(parsed);
  }

  return { ...EMPTY_CATALOG };
}

function readCatalogFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return { ...EMPTY_CATALOG };
  }

  const content = fs.readFileSync(filePath, "utf8");
  return parseCatalogRaw(content);
}

function writeCatalogFile(filePath, doc) {
  const normalized = isCatalogV2(doc) ? doc : migrateLegacyToV2(doc);
  fs.writeFileSync(filePath, `${JSON.stringify(normalized, null, 2)}\n`, "utf8");
  return normalized;
}

function activeEntries(doc) {
  return (doc.items || []).filter((entry) => entry && entry.deleted !== true);
}

function tombstones(doc) {
  return (doc.items || []).filter((entry) => entry && entry.deleted === true);
}

function sanitizeEntry(entry) {
  const label = String(entry.label || "").trim();
  const payload = {
    id: String(entry.id || ""),
    label,
    mtime: Number(entry.mtime) || Date.now(),
    ...(entry.deleted ? { deleted: true } : {}),
  };
  if (typeof entry.checked === "boolean") {
    payload.checked = entry.checked;
  }
  const valor = typeof entry.valor === "string" ? entry.valor.trim() : "";
  if (valor) {
    payload.valor = valor;
  }
  return payload;
}

function toApiPayload(doc) {
  return {
    schemaVersion: SCHEMA_VERSION,
    items: activeEntries(doc).map(sanitizeEntry),
  };
}

function catalogFileMtimeMs(doc) {
  const times = (doc.items || []).map((entry) => Number(entry.mtime) || 0);
  return times.length ? Math.max(...times) : Date.now();
}

function createEntry(label, mtime = Date.now(), valor = "", checked = undefined) {
  const trimmed = String(label || "").trim();
  if (!trimmed) {
    return null;
  }
  const entry = {
    id: crypto.randomUUID(),
    label: trimmed,
    mtime,
    deleted: false,
  };
  if (typeof checked === "boolean") {
    entry.checked = checked;
  }
  const amount = typeof valor === "string" ? valor.trim() : "";
  if (amount) {
    entry.valor = amount;
  }
  return entry;
}

function applyCheckedField(entry, checked) {
  if (typeof checked !== "boolean") {
    return entry;
  }

  return { ...entry, checked };
}

function upsertEntry(doc, { id, label, valor, checked }, mtime = Date.now(), invalidLabelError = "Informe um valor válido.") {
  const trimmed = String(label || "").trim();
  if (!trimmed) {
    return { doc, error: invalidLabelError };
  }

  const items = [...(doc.items || [])];
  const tomb = tombstones({ items });
  let active = activeEntries({ items });
  const amount = typeof valor === "string" ? valor.trim() : undefined;

  if (id) {
    const index = items.findIndex((entry) => entry.id === id);
    if (index === -1) {
      return { doc, error: "Item não encontrado." };
    }
    let next = { ...items[index], label: trimmed, mtime, deleted: false };
    if (amount !== undefined) {
      if (amount) {
        next.valor = amount;
      } else {
        delete next.valor;
      }
    }
    next = applyCheckedField(next, checked);
    items[index] = next;
    return { doc: { schemaVersion: SCHEMA_VERSION, items } };
  }

  const duplicate = active.find((entry) => normalizeText(entry.label) === normalizeText(trimmed));
  if (duplicate) {
    const index = items.findIndex((entry) => entry.id === duplicate.id);
    let next = { ...items[index], mtime, deleted: false };
    if (amount !== undefined) {
      if (amount) {
        next.valor = amount;
      } else {
        delete next.valor;
      }
    }
    next = applyCheckedField(next, checked);
    items[index] = next;
    return { doc: { schemaVersion: SCHEMA_VERSION, items } };
  }

  const created = createEntry(trimmed, mtime, amount || "", checked);
  active = [created, ...active].slice(0, MAX_ACTIVE);
  const activeIds = new Set(active.map((entry) => entry.id));
  const keptTomb = tomb.filter((entry) => !activeIds.has(entry.id));
  return {
    doc: { schemaVersion: SCHEMA_VERSION, items: [...active, ...keptTomb] },
  };
}

function deleteEntry(doc, { id, value }, mtime = Date.now()) {
  const items = [...(doc.items || [])];
  let index = -1;

  if (id) {
    index = items.findIndex((entry) => entry.id === id);
  } else if (value) {
    const key = normalizeText(value);
    index = items.findIndex(
      (entry) => entry.deleted !== true && normalizeText(entry.label) === key,
    );
  }

  if (index === -1) {
    return { doc };
  }

  items[index] = { ...items[index], deleted: true, mtime };
  return { doc: { schemaVersion: SCHEMA_VERSION, items } };
}

function replaceActiveOrder(doc, nextActive, mtime = Date.now(), listError = "Informe uma lista válida.") {
  if (!Array.isArray(nextActive)) {
    return { doc, error: listError };
  }

  const byId = new Map((doc.items || []).map((entry) => [entry.id, entry]));
  const ordered = [];

  for (const raw of nextActive) {
    const id = typeof raw?.id === "string" ? raw.id : "";
    const label = typeof raw?.label === "string" ? raw.label.trim() : typeof raw?.nome === "string" ? raw.nome.trim() : "";
    if (!id || !label) {
      continue;
    }
    const existing = byId.get(id);
    if (!existing || existing.deleted === true) {
      continue;
    }
    let next = {
      id,
      label,
      mtime,
      deleted: false,
    };
    const valor =
      typeof raw?.valor === "string"
        ? raw.valor.trim()
        : typeof existing.valor === "string"
          ? existing.valor.trim()
          : "";
    if (valor) {
      next.valor = valor;
    }
    if (typeof raw?.checked === "boolean") {
      next.checked = raw.checked;
    } else if (typeof existing.checked === "boolean") {
      next.checked = existing.checked;
    }
    ordered.push(next);
    if (ordered.length >= MAX_ACTIVE) {
      break;
    }
  }

  const orderedIds = new Set(ordered.map((entry) => entry.id));
  const tomb = tombstones(doc).filter((entry) => !orderedIds.has(entry.id));
  const leftoverActive = activeEntries(doc).filter((entry) => !orderedIds.has(entry.id));

  return {
    doc: {
      schemaVersion: SCHEMA_VERSION,
      items: [...ordered, ...leftoverActive, ...tomb],
    },
  };
}

module.exports = {
  SCHEMA_VERSION,
  MAX_ACTIVE,
  EMPTY_CATALOG,
  migrateLegacyToV2,
  isCatalogV2,
  parseCatalogRaw,
  readCatalogFile,
  writeCatalogFile,
  readPatientsCatalogFile: readCatalogFile,
  writePatientsCatalogFile: writeCatalogFile,
  activeEntries,
  toApiPayload,
  catalogFileMtimeMs,
  createEntry,
  upsertEntry,
  deleteEntry,
  replaceActiveOrder,
};
