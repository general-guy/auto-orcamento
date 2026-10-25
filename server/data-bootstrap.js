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

function shouldCopyLegacyFile(sourcePath, destPath) {
  if (!fs.existsSync(sourcePath)) {
    return false;
  }

  if (!fs.existsSync(destPath)) {
    return true;
  }

  const sourceMtime = fs.statSync(sourcePath).mtimeMs;
  const destMtime = fs.statSync(destPath).mtimeMs;
  return sourceMtime > destMtime;
}

function copyFileIfNeeded(sourcePath, destPath) {
  if (!shouldCopyLegacyFile(sourcePath, destPath)) {
    return false;
  }

  fs.mkdirSync(path.dirname(destPath), { recursive: true });
  const tempPath = destPath + ".tmp";
  fs.copyFileSync(sourcePath, tempPath);
  fs.renameSync(tempPath, destPath);
  return true;
}

/**
 * Garante dataDir populado: seed/data só preenche lacunas; {repo}/data legado
 * também atualiza destino se o arquivo no clone for mais recente.
 */
function ensureDataDirReady({ dataDir, seedDataDir, legacyRepoDataDir }) {
  fs.mkdirSync(dataDir, { recursive: true });

  let copied = 0;
  let updated = 0;

  if (seedDataDir && fs.existsSync(seedDataDir)) {
    for (const sourcePath of listFilesRecursive(seedDataDir)) {
      const relative = path.relative(seedDataDir, sourcePath);
      const destPath = path.join(dataDir, relative);
      if (copyFileIfMissing(sourcePath, destPath)) {
        copied += 1;
      }
    }
  }

  if (legacyRepoDataDir && fs.existsSync(legacyRepoDataDir)) {
    for (const sourcePath of listFilesRecursive(legacyRepoDataDir)) {
      const relative = path.relative(legacyRepoDataDir, sourcePath);
      if (!relative || relative.startsWith("..")) {
        continue;
      }
      const destPath = path.join(dataDir, relative);
      if (!fs.existsSync(destPath) && copyFileIfMissing(sourcePath, destPath)) {
        copied += 1;
        continue;
      }
      if (fs.existsSync(destPath) && copyFileIfNeeded(sourcePath, destPath)) {
        updated += 1;
      }
    }
  }

  return { copied, updated };
}

module.exports = {
  ensureDataDirReady,
};
