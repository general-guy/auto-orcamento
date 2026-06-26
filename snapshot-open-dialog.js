const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

function getPowerShellPath() {
  if (process.env.SystemRoot) {
    return path.join(process.env.SystemRoot, "System32", "WindowsPowerShell", "v1.0", "powershell.exe");
  }

  return "powershell.exe";
}

function pickSnapshotJsonFile(initialDir) {
  if (process.platform !== "win32") {
    return null;
  }

  const resolvedDir = fs.existsSync(initialDir) ? path.resolve(initialDir) : process.cwd();
  const escapedDir = resolvedDir.replace(/'/g, "''");
  const command = [
    "Add-Type -AssemblyName System.Windows.Forms",
    "$dialog = New-Object System.Windows.Forms.OpenFileDialog",
    "$dialog.Filter = 'Arquivos JSON (*.json)|*.json|Todos (*.*)|*.*'",
    `$dialog.InitialDirectory = '${escapedDir}'`,
    "$dialog.Title = 'Abrir orçamento'",
    "if ($dialog.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) { Write-Output $dialog.FileName }",
  ].join("; ");

  const output = execFileSync(getPowerShellPath(), ["-NoProfile", "-STA", "-Command", command], {
    encoding: "utf8",
    windowsHide: false,
    timeout: 10 * 60 * 1000,
  }).trim();

  return output || null;
}

module.exports = {
  pickSnapshotJsonFile,
};
