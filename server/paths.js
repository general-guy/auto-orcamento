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

const outputDir = resolveOutputDir();
const exportDir = path.join(repoRoot, "export");
const webDir = path.join(repoRoot, "web");
const dataDir = path.join(repoRoot, "data");

/** Caminho padrão de PDF/JSON no Windows (fora do repositório). */
const defaultWindowsOutputDir = "C:\\auto-orcamento\\output";

module.exports = {
  repoRoot,
  webDir,
  dataDir,
  outputDir,
  exportDir,
  resolveOutputDir,
  defaultWindowsOutputDir,
};
