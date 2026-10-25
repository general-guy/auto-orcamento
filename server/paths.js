const path = require("node:path");

const repoRoot = path.join(__dirname, "..");

function resolveOutputDir() {
  if (process.env.OUTPUT_DIR && String(process.env.OUTPUT_DIR).trim()) {
    return path.resolve(String(process.env.OUTPUT_DIR).trim());
  }

  if (process.platform === "win32") {
    return path.resolve("C:\\auto-orcamento\\output");
  }

  return path.join(repoRoot, "output");
}

function resolveDataDir() {
  if (process.env.DATA_DIR && String(process.env.DATA_DIR).trim()) {
    return path.resolve(String(process.env.DATA_DIR).trim());
  }

  if (process.platform === "win32") {
    return path.resolve("C:\\auto-orcamento\\data");
  }

  return path.join(repoRoot, "data");
}

const outputDir = resolveOutputDir();
const dataDir = resolveDataDir();
const exportDir = path.join(repoRoot, "export");
const webDir = path.join(repoRoot, "web");
const seedDataDir = path.join(repoRoot, "seed", "data");
const legacyRepoDataDir = path.join(repoRoot, "data");

/** Caminho padrão de PDF/JSON no Windows (fora do repositório). */
const defaultWindowsOutputDir = "C:\\auto-orcamento\\output";

/** Dados mutáveis e tabelas em runtime no Windows (fora do repositório). */
const defaultWindowsDataDir = "C:\\auto-orcamento\\data";

/** Cópia espelho do SQLite no Windows (fora do repositório). */
const defaultWindowsExportDir = "C:\\auto-orcamento\\export";

module.exports = {
  repoRoot,
  webDir,
  dataDir,
  outputDir,
  exportDir,
  seedDataDir,
  legacyRepoDataDir,
  resolveOutputDir,
  resolveDataDir,
  defaultWindowsOutputDir,
  defaultWindowsDataDir,
  defaultWindowsExportDir,
};
