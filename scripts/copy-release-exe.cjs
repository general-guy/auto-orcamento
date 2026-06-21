const fs = require("node:fs");
const path = require("node:path");

const rootDir = path.join(__dirname, "..");
const source = path.join(rootDir, "src-tauri", "target", "release", "auto-orcamento.exe");
const target = path.join(rootDir, "auto-orcamento.exe");

if (!fs.existsSync(source)) {
  console.error("Build release não encontrado:", source);
  console.error("Execute npm run tauri:build antes de copiar o executável.");
  process.exit(1);
}

fs.copyFileSync(source, target);
console.log("Executável copiado para:", target);
