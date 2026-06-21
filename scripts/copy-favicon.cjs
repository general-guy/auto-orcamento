const fs = require("node:fs");
const path = require("node:path");

const rootDir = path.join(__dirname, "..");
const source = path.join(rootDir, "src-tauri", "icons", "32x32.png");
const target = path.join(rootDir, "assets", "favicon.png");

fs.copyFileSync(source, target);
console.log("Favicon copied to assets/favicon.png");
