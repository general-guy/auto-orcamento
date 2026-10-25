const fs = require("node:fs");
const path = require("node:path");

function listFilesRecursive(dir) {
  const results = [];
  if (!fs.existsSync(dir)) {
    return results;
  }

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const absolute = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...listFilesRecursive(absolute));
      continue;
    }
    results.push(absolute);
  }

  return results;
}

function copyFileIfMissing(sourcePath, destPath) {
  if (!fs.existsSync(sourcePath) || fs.existsSync(destPath)) {
    return false;
  }

  fs.mkdirSync(path.dirname(destPath), { recursive: true });
  fs.copyFileSync(sourcePath, destPath);
  return true;
}

/**
 * Garante dataDir populado: copia de seed/data e, se ainda existir, de {repo}/data legado.
 * Nunca sobrescreve arquivos já presentes em dataDir.
 */
function ensureDataDirReady({ dataDir, seedDataDir, legacyRepoDataDir }) {
  fs.mkdirSync(dataDir, { recursive: true });

  let copied = 0;
  for (const sourceRoot of [seedDataDir, legacyRepoDataDir]) {
    if (!sourceRoot || !fs.existsSync(sourceRoot)) {
      continue;
    }

    for (const sourcePath of listFilesRecursive(sourceRoot)) {
      const relative = path.relative(sourceRoot, sourcePath);
      const destPath = path.join(dataDir, relative);
      if (copyFileIfMissing(sourcePath, destPath)) {
        copied += 1;
      }
    }
  }

  return { copied };
}

module.exports = {
  ensureDataDirReady,
};
