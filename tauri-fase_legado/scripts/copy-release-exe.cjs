const fs = require("node:fs");
const path = require("node:path");

const legacyDir = path.join(__dirname, "..");
const repoRoot = path.join(legacyDir, "..");
const source = path.join(legacyDir, "src-tauri", "target", "release", "auto-orcamento.exe");
const target = path.join(legacyDir, "auto-orcamento.exe");

if (!fs.existsSync(source)) {
  console.error("Build release não encontrado:", source);
  console.error("Execute npm run tauri:build antes de copiar o executável.");
  process.exit(1);
}

fs.copyFileSync(source, target);
console.log("Executável copiado para:", target);
