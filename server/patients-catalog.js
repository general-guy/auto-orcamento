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

function migrateLegacyToV2(parsed, migrationTime = Date.now()) {
  const labels = Array.isArray(parsed) ? parsed : [];
  const items = labels
    .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
    .filter(Boolean)
    .map((label) => ({
      id: crypto.randomUUID(),
      label,
      mtime: migrationTime,
      deleted: false,
    }));
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

function readPatientsCatalogFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return { ...EMPTY_CATALOG };
  }

  const content = fs.readFileSync(filePath, "utf8");
  return parseCatalogRaw(content);
}

function writePatientsCatalogFile(filePath, doc) {
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

function toApiPayload(doc) {
  return {
    schemaVersion: SCHEMA_VERSION,
    items: activeEntries(doc).map(sanitizeEntry),
  };
}

function sanitizeEntry(entry) {
  return {
    id: String(entry.id || ""),
    label: String(entry.label || "").trim(),
    mtime: Number(entry.mtime) || Date.now(),
    ...(entry.deleted ? { deleted: true } : {}),
  };
}

function catalogFileMtimeMs(doc) {
  const times = (doc.items || []).map((entry) => Number(entry.mtime) || 0);
  return times.length ? Math.max(...times) : Date.now();
}

function createEntry(label, mtime = Date.now()) {
  const trimmed = String(label || "").trim();
  if (!trimmed) {
    return null;
  }
  return {
    id: crypto.randomUUID(),
    label: trimmed,
    mtime,
    deleted: false,
  };
}

function upsertEntry(doc, { id, label }, mtime = Date.now()) {
  const trimmed = String(label || "").trim();
  if (!trimmed) {
    return { doc, error: "Informe um paciente válido." };
  }

  const items = [...(doc.items || [])];
  const tomb = tombstones({ items });
  let active = activeEntries({ items });

  if (id) {
    const index = items.findIndex((entry) => entry.id === id);
    if (index === -1) {
      return { doc, error: "Paciente não encontrado." };
    }
    items[index] = { ...items[index], label: trimmed, mtime, deleted: false };
    return { doc: { schemaVersion: SCHEMA_VERSION, items } };
  }

  {
    const created = createEntry(trimmed, mtime);
    active = [created, ...active].slice(0, MAX_ACTIVE);
    const activeIds = new Set(active.map((entry) => entry.id));
    const keptTomb = tomb.filter((entry) => !activeIds.has(entry.id));
    return {
      doc: { schemaVersion: SCHEMA_VERSION, items: [...active, ...keptTomb] },
    };
  }
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

function replaceActiveOrder(doc, nextActive, mtime = Date.now()) {
  if (!Array.isArray(nextActive)) {
    return { doc, error: "Informe uma lista de pacientes." };
  }

  const byId = new Map((doc.items || []).map((entry) => [entry.id, entry]));
  const ordered = [];

  for (const raw of nextActive) {
    const id = typeof raw?.id === "string" ? raw.id : "";
    const label = typeof raw?.label === "string" ? raw.label.trim() : "";
    if (!id || !label) {
      continue;
    }
    const existing = byId.get(id);
    if (!existing || existing.deleted === true) {
      continue;
    }
    ordered.push({
      id,
      label,
      mtime,
      deleted: false,
    });
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
  readPatientsCatalogFile,
  writePatientsCatalogFile,
  activeEntries,
  toApiPayload,
  catalogFileMtimeMs,
  createEntry,
  upsertEntry,
  deleteEntry,
  replaceActiveOrder,
};
