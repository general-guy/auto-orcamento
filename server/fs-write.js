const fs = require("node:fs");
const path = require("node:path");

/**
 * Grava texto substituindo o destino sem abrir o inode existente.
 * No axis-data (ficheiros nobody 0644 + dir 0777), writeFileSync dá EACCES;
 * rename/unlink no diretório funciona.
 */
function writeTextFileReplace(filePath, content, encoding = "utf8") {
  const absolute = path.resolve(filePath);
  fs.mkdirSync(path.dirname(absolute), { recursive: true });
  const tempPath = `${absolute}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(tempPath, content, encoding);

  try {
    fs.renameSync(tempPath, absolute);
  } catch (renameError) {
    try {
      fs.unlinkSync(absolute);
    } catch (unlinkError) {
      if (unlinkError.code !== "ENOENT") {
        try {
          fs.unlinkSync(tempPath);
        } catch {
          // ignore
        }
        throw unlinkError;
      }
    }

    try {
      fs.renameSync(tempPath, absolute);
    } catch (secondError) {
      try {
        fs.unlinkSync(tempPath);
      } catch {
        // ignore
      }
      throw secondError;
    }
  }

  return absolute;
}

module.exports = {
  writeTextFileReplace,
};
