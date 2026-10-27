const fs = require("node:fs");
const { execFileSync } = require("node:child_process");

/**
 * Windows (Atlas): Lixeira, como no Explorer.
 * Linux (CT 100): remoção permanente (sem lixeira de desktop).
 */
function trashOrUnlink(absolutePath) {
  if (!absolutePath || !fs.existsSync(absolutePath)) {
    return false;
  }

  if (process.platform === "win32") {
    const escaped = String(absolutePath).replace(/'/g, "''");
    const command =
      "Add-Type -AssemblyName Microsoft.VisualBasic; " +
      `[Microsoft.VisualBasic.FileIO.FileSystem]::DeleteFile('${escaped}', 'OnlyErrorDialogs', 'SendToRecycleBin')`;
    execFileSync("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", command], {
      stdio: "pipe",
    });
    return true;
  }

  fs.unlinkSync(absolutePath);
  return true;
}

module.exports = {
  trashOrUnlink,
};
