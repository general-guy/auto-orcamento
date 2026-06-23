const { spawnSync } = require("node:child_process");
const path = require("node:path");

const rootDir = path.join(__dirname, "..");
const scriptPath = path.join(__dirname, "build-web-icons.ps1");

const result = spawnSync(
  "powershell",
  ["-ExecutionPolicy", "Bypass", "-File", scriptPath],
  { cwd: rootDir, stdio: "inherit", windowsHide: true },
);

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}
