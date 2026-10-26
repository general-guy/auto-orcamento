const fs = require("node:fs");
const path = require("node:path");

const repoRoot = path.join(__dirname, "..");

/** CT 100 bind mp1 (axis-data); paridade com C:\auto-orcamento no Atlas. */
const defaultLinuxAxisDataRoot = "/data/auto-orcamento";

function linuxUsesAxisDataBind() {
  return process.platform !== "win32" && fs.existsSync(defaultLinuxAxisDataRoot);
}

function resolveOutputDir() {
  if (process.env.OUTPUT_DIR && String(process.env.OUTPUT_DIR).trim()) {
    return path.resolve(String(process.env.OUTPUT_DIR).trim());
  }

  if (process.platform === "win32") {
    return path.resolve("C:\\auto-orcamento\\output");
  }

  if (linuxUsesAxisDataBind()) {
    return path.join(defaultLinuxAxisDataRoot, "output");
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

  if (linuxUsesAxisDataBind()) {
    return path.join(defaultLinuxAxisDataRoot, "data");
  }

  return path.join(repoRoot, "data");
}

function resolveExportDir() {
  if (process.env.EXPORT_DIR && String(process.env.EXPORT_DIR).trim()) {
    return path.resolve(String(process.env.EXPORT_DIR).trim());
  }

  if (process.platform === "win32") {
    return path.resolve("C:\\auto-orcamento\\export");
  }

  if (linuxUsesAxisDataBind()) {
    return path.join(defaultLinuxAxisDataRoot, "export");
  }

  return path.join(repoRoot, "export");
}

const outputDir = resolveOutputDir();
const dataDir = resolveDataDir();
const exportDir = resolveExportDir();
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
  resolveExportDir,
  linuxUsesAxisDataBind,
  defaultLinuxAxisDataRoot,
  defaultWindowsOutputDir,
  defaultWindowsDataDir,
  defaultWindowsExportDir,
};
