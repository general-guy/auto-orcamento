const { spawn } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const appUrl = "http://localhost:3000";
const rootDir = __dirname;
const browserProfileDir = path.join(os.tmpdir(), "auto-orcamento-browser-profile");

const browserCandidates = [
  process.env.AUTO_ORCAMENTO_BROWSER,
  path.join(process.env["ProgramFiles(x86)"] || "", "Microsoft", "Edge", "Application", "msedge.exe"),
  path.join(process.env.ProgramFiles || "", "Microsoft", "Edge", "Application", "msedge.exe"),
  path.join(process.env.LocalAppData || "", "Microsoft", "Edge", "Application", "msedge.exe"),
  path.join(process.env.ProgramFiles || "", "Google", "Chrome", "Application", "chrome.exe"),
  path.join(process.env["ProgramFiles(x86)"] || "", "Google", "Chrome", "Application", "chrome.exe"),
  path.join(process.env.LocalAppData || "", "Google", "Chrome", "Application", "chrome.exe"),
].filter(Boolean);

let serverProcess = null;
let browserProcess = null;
let isShuttingDown = false;

function getBrowserPath() {
  return browserCandidates.find((candidate) => fs.existsSync(candidate));
}

function shutdown(exitCode = 0) {
  if (isShuttingDown) {
    return;
  }

  isShuttingDown = true;

  if (serverProcess && !serverProcess.killed) {
    serverProcess.kill();
  }

  process.exit(exitCode);
}

function openBrowserApp(browserPath) {
  browserProcess = spawn(
    browserPath,
    [
      `--app=${appUrl}`,
      `--user-data-dir=${browserProfileDir}`,
      "--no-first-run",
      "--new-window",
      "--start-maximized",
    ],
    {
      stdio: "ignore",
      windowsHide: false,
    }
  );

  browserProcess.on("exit", () => shutdown(0));
}

function startServer() {
  return new Promise((resolve, reject) => {
    serverProcess = spawn(process.execPath, ["server.js"], {
      cwd: rootDir,
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: false,
    });

    serverProcess.stdout.on("data", (chunk) => {
      const text = chunk.toString();
      process.stdout.write(text);

      if (text.includes(appUrl)) {
        resolve();
      }
    });

    serverProcess.stderr.on("data", (chunk) => {
      process.stderr.write(chunk);
    });

    serverProcess.on("exit", (code) => {
      if (!isShuttingDown) {
        reject(new Error(`O servidor foi encerrado com codigo ${code}.`));
      }
    });
  });
}

async function main() {
  const browserPath = getBrowserPath();

  if (!browserPath) {
    console.error("Nao foi possivel encontrar Microsoft Edge ou Google Chrome.");
    process.exit(1);
  }

  try {
    await startServer();
    openBrowserApp(browserPath);
  } catch (error) {
    console.error(error.message);
    shutdown(1);
  }
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));

main();
