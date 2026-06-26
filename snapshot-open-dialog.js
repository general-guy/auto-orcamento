const { execFileSync, execSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const pythonDialogScriptPath = path.join(__dirname, "scripts", "open-snapshot-dialog.py");
const powershellDialogScriptPath = path.join(__dirname, "scripts", "open-snapshot-dialog.ps1");

function getPowerShellPath() {
  if (process.env.SystemRoot) {
    return path.join(process.env.SystemRoot, "System32", "WindowsPowerShell", "v1.0", "powershell.exe");
  }

  return "powershell.exe";
}

function findPythonExecutable() {
  const candidates = [];

  if (process.env.PYTHON) {
    candidates.push(process.env.PYTHON);
  }

  try {
    const fromPath = execSync("where python", { encoding: "utf8", windowsHide: true })
      .trim()
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
    candidates.push(...fromPath);
  } catch {
    // ignore
  }

  try {
    const pythonwPath = execSync("where pythonw", { encoding: "utf8", windowsHide: true })
      .trim()
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)[0];

    if (pythonwPath) {
      candidates.push(pythonwPath.replace(/pythonw\.exe$/i, "python.exe"));
    }
  } catch {
    // ignore
  }

  candidates.push("python", "py");

  for (const candidate of candidates) {
    if (!candidate) {
      continue;
    }

    try {
      execFileSync(candidate, ["-c", "import tkinter"], { stdio: "ignore", windowsHide: true });
      return candidate;
    } catch {
      // try next
    }
  }

  return null;
}

function runDialogCommand(executable, args) {
  try {
    const output = execFileSync(executable, args, {
      encoding: "utf8",
      windowsHide: false,
      timeout: 10 * 60 * 1000,
    }).trim();

    return output || null;
  } catch (error) {
    if (error.status === 1) {
      return null;
    }

    const stderr = typeof error.stderr === "string" ? error.stderr.trim() : "";
    const details = stderr || error.message;
    throw new Error(details);
  }
}

function pickSnapshotJsonFileWithPowerShell(initialDir) {
  if (!fs.existsSync(powershellDialogScriptPath)) {
    throw new Error(`Script do seletor não encontrado: ${powershellDialogScriptPath}`);
  }

  return runDialogCommand(getPowerShellPath(), [
    "-NoProfile",
    "-STA",
    "-ExecutionPolicy",
    "Bypass",
    "-File",
    powershellDialogScriptPath,
    initialDir,
  ]);
}

function pickSnapshotJsonFile(initialDir) {
  if (process.platform !== "win32") {
    return null;
  }

  const resolvedDir = path.resolve(initialDir);
  if (!fs.existsSync(resolvedDir) || !fs.statSync(resolvedDir).isDirectory()) {
    throw new Error(`Pasta inicial inválida: ${initialDir}`);
  }

  const python = findPythonExecutable();
  if (python && fs.existsSync(pythonDialogScriptPath)) {
    try {
      return runDialogCommand(python, [pythonDialogScriptPath, resolvedDir]);
    } catch (error) {
      console.warn(`Seletor Python falhou; tentando PowerShell. ${error.message}`);
    }
  }

  return pickSnapshotJsonFileWithPowerShell(resolvedDir);
}

module.exports = {
  findPythonExecutable,
  pickSnapshotJsonFile,
};
