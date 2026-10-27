const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const { trashOrUnlink } = require("./trash-file");

const SCHEMA_VERSION = 1;
const INDEX_BASENAME = "orcamentos-index.json";

const EMPTY_INDEX = {
  schemaVersion: SCHEMA_VERSION,
  items: [],
};

function indexFilePath(outputDir) {
  return path.join(outputDir, INDEX_BASENAME);
}

function indexRelativePath() {
  return INDEX_BASENAME;
}

function isIndexBasename(name) {
  return path.basename(name) === INDEX_BASENAME;
}

function normalizeOutputRelative(raw) {
  if (typeof raw !== "string" || !raw.trim()) {
    return null;
  }

  const normalized = raw.replace(/\\/g, "/").replace(/^\/+/, "");
  if (!normalized || normalized.includes("..")) {
    return null;
  }

  const segments = normalized.split("/");
  if (segments.some((segment) => !segment || segment === ".")) {
    return null;
  }

  if (path.extname(normalized).toLowerCase() !== ".json") {
    return null;
  }

  if (path.basename(normalized) === INDEX_BASENAME) {
    return null;
  }

  return normalized;
}

function toPosixRelative(outputDir, absolutePath) {
  const relative = path.relative(outputDir, absolutePath);
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) {
    return null;
  }

  return normalizeOutputRelative(relative.replace(/\\/g, "/"));
}

function pdfRelativeForJson(jsonRelative) {
  if (!jsonRelative) {
    return null;
  }

  return jsonRelative.replace(/\.json$/i, ".pdf");
}

function readIndexDoc(outputDir) {
  const filePath = indexFilePath(outputDir);
  if (!fs.existsSync(filePath)) {
    return { ...EMPTY_INDEX, items: [] };
  }

  try {
    const parsed = JSON.parse(fs.readFileSync(filePath, "utf8"));
    if (
      parsed &&
      typeof parsed === "object" &&
      parsed.schemaVersion === SCHEMA_VERSION &&
      Array.isArray(parsed.items)
    ) {
      return parsed;
    }
  } catch {
    // ignore
  }

  return { ...EMPTY_INDEX, items: [] };
}

function writeIndexDoc(outputDir, doc) {
  const filePath = indexFilePath(outputDir);
  fs.mkdirSync(outputDir, { recursive: true });
  const payload = {
    schemaVersion: SCHEMA_VERSION,
    items: Array.isArray(doc.items) ? doc.items : [],
  };
  fs.writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  const maxMtimeMs = payload.items.reduce(
    (best, item) => Math.max(best, Number(item?.mtime) || 0),
    0,
  );
  if (maxMtimeMs > 0) {
    const sec = maxMtimeMs / 1000;
    fs.utimesSync(filePath, sec, sec);
  }
  return filePath;
}

function findItemByJsonRelative(doc, jsonRelative) {
  const key = normalizeOutputRelative(jsonRelative);
  if (!key) {
    return null;
  }

  return (doc.items || []).find((item) => normalizeOutputRelative(item?.json) === key) || null;
}

function registerExportPair(outputDir, { jsonAbsolute, pdfAbsolute }) {
  const jsonRelative = toPosixRelative(outputDir, jsonAbsolute);
  const pdfRelative = pdfAbsolute ? toPosixRelative(outputDir, pdfAbsolute) : pdfRelativeForJson(jsonRelative);
  if (!jsonRelative || !pdfRelative) {
    return readIndexDoc(outputDir);
  }

  const mtime = Date.now();
  const doc = readIndexDoc(outputDir);
  const items = [...(doc.items || [])];
  const existing = findItemByJsonRelative(doc, jsonRelative);

  if (existing) {
    const index = items.findIndex((item) => item.id === existing.id);
    if (index !== -1) {
      items[index] = {
        ...items[index],
        json: jsonRelative,
        pdf: pdfRelative,
        mtime,
        deleted: false,
      };
    }
  } else {
    items.push({
      id: crypto.randomUUID(),
      json: jsonRelative,
      pdf: pdfRelative,
      mtime,
      deleted: false,
    });
  }

  writeIndexDoc(outputDir, { items });
  return readIndexDoc(outputDir);
}

function tombstoneByJsonRelative(outputDir, jsonRelativeRaw) {
  const jsonRelative = normalizeOutputRelative(jsonRelativeRaw);
  if (!jsonRelative) {
    return { error: "Nome de arquivo inválido." };
  }

  const doc = readIndexDoc(outputDir);
  const items = [...(doc.items || [])];
  const mtime = Date.now();
  let item = findItemByJsonRelative(doc, jsonRelative);

  if (!item) {
    item = {
      id: crypto.randomUUID(),
      json: jsonRelative,
      pdf: pdfRelativeForJson(jsonRelative),
      mtime,
      deleted: true,
    };
    items.push(item);
  } else {
    const index = items.findIndex((entry) => entry.id === item.id);
    items[index] = {
      ...items[index],
      json: jsonRelative,
      pdf: pdfRelativeForJson(jsonRelative),
      mtime,
      deleted: true,
    };
  }

  writeIndexDoc(outputDir, { items });
  return { jsonRelative, pdfRelative: pdfRelativeForJson(jsonRelative), mtime };
}

function isJsonTombstoned(doc, jsonRelative) {
  const item = findItemByJsonRelative(doc, jsonRelative);
  return Boolean(item?.deleted);
}

function listJsonFilesOnDisk(outputDir) {
  const results = [];

  function walk(dir) {
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
        continue;
      }

      if (!entry.isFile() || path.extname(entry.name).toLowerCase() !== ".json") {
        continue;
      }

      if (isIndexBasename(entry.name) && dir === outputDir) {
        continue;
      }

      const relative = toPosixRelative(outputDir, fullPath);
      if (relative) {
        results.push({ relative, fullPath });
      }
    }
  }

  walk(outputDir);
  return results;
}

function ensureIndexCoversDisk(outputDir) {
  const doc = readIndexDoc(outputDir);
  const items = [...(doc.items || [])];
  const knownJson = new Set(
    items.map((item) => normalizeOutputRelative(item?.json)).filter(Boolean),
  );
  let changed = false;

  for (const row of listJsonFilesOnDisk(outputDir)) {
    if (knownJson.has(row.relative)) {
      continue;
    }

    const pdfRelative = pdfRelativeForJson(row.relative);
    items.push({
      id: crypto.randomUUID(),
      json: row.relative,
      pdf: pdfRelative,
      mtime: Date.now(),
      deleted: false,
    });
    knownJson.add(row.relative);
    changed = true;
  }

  if (changed) {
    writeIndexDoc(outputDir, { items });
  }
}

function listVisibleSnapshots(outputDir) {
  ensureIndexCoversDisk(outputDir);
  const doc = readIndexDoc(outputDir);
  const tombstoned = new Set(
    (doc.items || [])
      .filter((item) => item?.deleted === true)
      .map((item) => normalizeOutputRelative(item.json))
      .filter(Boolean),
  );

  const rows = [];

  for (const row of listJsonFilesOnDisk(outputDir)) {
    if (tombstoned.has(row.relative)) {
      continue;
    }

    let modifiedAt = null;
    let size = 0;
    try {
      const stats = fs.statSync(row.fullPath);
      modifiedAt = stats.mtime.toISOString();
      size = stats.size;
    } catch {
      continue;
    }

    rows.push({
      name: row.relative,
      modifiedAt,
      size,
    });
  }

  rows.sort((left, right) => String(right.modifiedAt).localeCompare(String(left.modifiedAt)));
  return rows;
}

function removePairFiles(outputDir, jsonRelative, pdfRelative) {
  const removed = [];
  for (const relative of [jsonRelative, pdfRelative]) {
    if (!relative) {
      continue;
    }
    const absolute = path.resolve(outputDir, relative);
    if (!absolute.startsWith(path.resolve(outputDir) + path.sep)) {
      continue;
    }
    if (trashOrUnlink(absolute)) {
      removed.push(relative);
    }
  }
  return removed;
}

function activeJsonRelativeSet(doc) {
  return new Set(
    (doc.items || [])
      .filter((item) => item?.deleted !== true)
      .map((item) => normalizeOutputRelative(item.json))
      .filter(Boolean),
  );
}

module.exports = {
  SCHEMA_VERSION,
  INDEX_BASENAME,
  indexFilePath,
  indexRelativePath,
  isIndexBasename,
  toPosixRelative,
  normalizeOutputRelative,
  readIndexDoc,
  writeIndexDoc,
  registerExportPair,
  tombstoneByJsonRelative,
  isJsonTombstoned,
  listVisibleSnapshots,
  ensureIndexCoversDisk,
  removePairFiles,
  activeJsonRelativeSet,
  listJsonFilesOnDisk,
};
