const path = require("node:path");
const { consolidateOutputToSqlite } = require("../server/export-sqlite");

const repoRoot = path.join(__dirname, "..");
const outputDir = path.join(repoRoot, "output");
const exportDir = path.join(repoRoot, "export");

try {
  const result = consolidateOutputToSqlite({ outputDir, exportDir });
  const skippedNote = result.skipped > 0 ? ` (${result.skipped} ignorado(s))` : "";
  console.log(
    `SQLite atualizado: ${result.dbRelativeHint} com ${result.count} orçamento(s)${skippedNote}.`,
  );
  if (result.errors.length > 0) {
    for (const error of result.errors) {
      console.warn(`- ${error.file}: ${error.message}`);
    }
  }
} catch (error) {
  console.error(`Falha ao consolidar output/ em SQLite: ${error.message}`);
  process.exitCode = 1;
}