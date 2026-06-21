const fs = require("node:fs");
const path = require("node:path");

const rootDir = path.join(__dirname, "..");
const distDir = path.join(rootDir, "dist");

function copyDirectory(sourceDir, targetDir) {
  fs.mkdirSync(targetDir, { recursive: true });

  for (const entry of fs.readdirSync(sourceDir, { withFileTypes: true })) {
    const sourcePath = path.join(sourceDir, entry.name);
    const targetPath = path.join(targetDir, entry.name);

    if (entry.isDirectory()) {
      copyDirectory(sourcePath, targetPath);
      continue;
    }

    fs.copyFileSync(sourcePath, targetPath);
  }
}

fs.rmSync(distDir, { recursive: true, force: true });
fs.mkdirSync(distDir, { recursive: true });

for (const fileName of ["index.html", "app.js", "api.js", "pdf-build.js", "zoom.js", "styles.css"]) {
  fs.copyFileSync(path.join(rootDir, fileName), path.join(distDir, fileName));
}

for (const directoryName of ["assets", "data"]) {
  copyDirectory(path.join(rootDir, directoryName), path.join(distDir, directoryName));
}

console.log("Frontend copied to dist/");
