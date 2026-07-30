const fs = require("node:fs");
const path = require("node:path");
const { DatabaseSync } = require("node:sqlite");

const DEFAULT_DB_NAME = "orcamentos.sqlite";

function ensureExportDir(exportDir) {
  fs.mkdirSync(exportDir, { recursive: true });
}

function listSnapshotJsonFiles(outputDir) {
  let entries;
  try {
    entries = fs.readdirSync(outputDir, { withFileTypes: true });
  } catch {
    return [];
  }

  return entries
    .filter((entry) => entry.isFile() && path.extname(entry.name).toLowerCase() === ".json")
    .map((entry) => path.join(outputDir, entry.name))
    .sort((left, right) => path.basename(left).localeCompare(path.basename(right), "pt-BR"));
}

function parseCreatedAtFromFilename(filename) {
  const match = String(filename).match(
    /(\d{4}-\d{2}-\d{2}) (\d{2})-(\d{2})-(\d{2})(?: \(\d+\))?\.json$/i,
  );
  if (!match) {
    return null;
  }

  const [, date, hours, minutes, seconds] = match;
  return date + "T" + hours + ":" + minutes + ":" + seconds;
}

function extractFirstSurgery(snapshot) {
  if (!Array.isArray(snapshot?.form?.surgeries)) {
    return "";
  }

  return snapshot.form.surgeries.map((item) => String(item).trim()).find(Boolean) || "";
}

function readSnapshotRecord(jsonPath) {
  const filename = path.basename(jsonPath);
  const raw = fs.readFileSync(jsonPath, "utf8");
  let snapshot;

  try {
    snapshot = JSON.parse(raw);
  } catch (error) {
    throw new Error("JSON inválido em " + filename + ": " + error.message);
  }

  if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot)) {
    throw new Error("Snapshot inválido em " + filename + ".");
  }

  const stats = fs.statSync(jsonPath);
  const form = snapshot.form && typeof snapshot.form === "object" ? snapshot.form : {};

  return {
    filename,
    patientName: typeof form.patientName === "string" ? form.patientName.trim() : "",
    firstSurgery: extractFirstSurgery(snapshot),
    createdAt: parseCreatedAtFromFilename(filename),
    exportedAt: typeof snapshot.exportedAt === "string" ? snapshot.exportedAt : null,
    budgetDate: typeof form.budgetDate === "string" ? form.budgetDate : null,
    schemaVersion: Number.isInteger(snapshot.schemaVersion) ? snapshot.schemaVersion : null,
    payloadJson: JSON.stringify(snapshot),
    sourceMtime: stats.mtime.toISOString(),
  };
}

function openDatabase(dbPath) {
  const db = new DatabaseSync(dbPath);
  db.exec(
    "PRAGMA journal_mode = WAL;\n" +
      "CREATE TABLE IF NOT EXISTS budgets (\n" +
      "  id INTEGER PRIMARY KEY AUTOINCREMENT,\n" +
      "  filename TEXT NOT NULL UNIQUE,\n" +
      "  patient_name TEXT,\n" +
      "  first_surgery TEXT,\n" +
      "  created_at TEXT,\n" +
      "  exported_at TEXT,\n" +
      "  budget_date TEXT,\n" +
      "  schema_version INTEGER,\n" +
      "  payload_json TEXT NOT NULL,\n" +
      "  source_mtime TEXT,\n" +
      "  consolidated_at TEXT NOT NULL\n" +
      ");\n" +
      "CREATE INDEX IF NOT EXISTS idx_budgets_patient_name ON budgets(patient_name);\n" +
      "CREATE INDEX IF NOT EXISTS idx_budgets_created_at ON budgets(created_at);\n" +
      "CREATE INDEX IF NOT EXISTS idx_budgets_first_surgery ON budgets(first_surgery);"
  );
  return db;
}

/**
 * Lê todos os JSON em output/ e regrava o SQLite em export/.
 * O banco espelha o conteúdo atual de output/ (reconstrução completa).
 */
function consolidateOutputToSqlite({
  outputDir,
  exportDir,
  dbName = DEFAULT_DB_NAME,
} = {}) {
  if (!outputDir || !exportDir) {
    throw new Error("outputDir e exportDir são obrigatórios.");
  }

  ensureExportDir(exportDir);

  const dbPath = path.join(exportDir, dbName);
  const jsonPaths = listSnapshotJsonFiles(outputDir);
  const records = [];
  const errors = [];

  for (const jsonPath of jsonPaths) {
    try {
      records.push(readSnapshotRecord(jsonPath));
    } catch (error) {
      errors.push({
        file: path.basename(jsonPath),
        message: error.message,
      });
    }
  }

  const consolidatedAt = new Date().toISOString();
  const db = openDatabase(dbPath);

  try {
    db.exec("BEGIN");
    db.exec("DELETE FROM budgets");

    const insert = db.prepare(
      "INSERT INTO budgets (\n" +
        "  filename,\n" +
        "  patient_name,\n" +
        "  first_surgery,\n" +
        "  created_at,\n" +
        "  exported_at,\n" +
        "  budget_date,\n" +
        "  schema_version,\n" +
        "  payload_json,\n" +
        "  source_mtime,\n" +
        "  consolidated_at\n" +
        ") VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    );

    for (const record of records) {
      insert.run(
        record.filename,
        record.patientName,
        record.firstSurgery,
        record.createdAt,
        record.exportedAt,
        record.budgetDate,
        record.schemaVersion,
        record.payloadJson,
        record.sourceMtime,
        consolidatedAt,
      );
    }

    db.exec("COMMIT");
  } catch (error) {
    try {
      db.exec("ROLLBACK");
    } catch {
      // ignore rollback failures
    }
    throw error;
  } finally {
    db.close();
  }

  return {
    dbPath,
    dbRelativeHint: path.join("export", dbName).split(path.sep).join("/"),
    count: records.length,
    skipped: errors.length,
    errors,
    consolidatedAt,
  };
}

module.exports = {
  DEFAULT_DB_NAME,
  consolidateOutputToSqlite,
  listSnapshotJsonFiles,
  parseCreatedAtFromFilename,
};