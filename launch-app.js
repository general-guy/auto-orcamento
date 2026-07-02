const { spawn } = require("node:child_process");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const { freeTcpPortSync } = require("./port-utils");

const appUrl = "http://127.0.0.1:3000";
const appPort = 3000;
const rootDir = __dirname;
const externalServer = process.argv.includes("--external-server");
const keepServer = process.argv.includes("--keep-server");

const browserCandidates = [
  process.env.AUTO_ORCAMENTO_BROWSER,
  path.join(process.env.ProgramFiles || "", "Google", "Chrome", "Application", "chrome.exe"),
  path.join(process.env["ProgramFiles(x86)"] || "", "Google", "Chrome", "Application", "chrome.exe"),
  path.join(process.env.LocalAppData || "", "Google", "Chrome", "Application", "chrome.exe"),
  path.join(process.env["ProgramFiles(x86)"] || "", "Microsoft", "Edge", "Application", "msedge.exe"),
  path.join(process.env.ProgramFiles || "", "Microsoft", "Edge", "Application", "msedge.exe"),
  path.join(process.env.LocalAppData || "", "Microsoft", "Edge", "Application", "msedge.exe"),
].filter(Boolean);

const browserProfileDir = path.join(
  process.env.LOCALAPPDATA || require("node:os").homedir(),
  "Auto Orcamento",
  "browser-profile",
);

let serverProcess = null;
let browserProcess = null;
let isShuttingDown = false;

function getBrowserPath() {
  return browserCandidates.find((candidate) => fs.existsSync(candidate));
}

function waitForServer(timeoutMs = 20000) {
  const deadline = Date.now() + timeoutMs;

  return new Promise((resolve, reject) => {
    const attempt = () => {
      const request = http.get(`${appUrl}/api/settings`, (response) => {
        response.resume();
        if (response.statusCode && response.statusCode < 500) {
          resolve();
          return;
        }

        retry();
      });

      request.on("error", retry);
      request.setTimeout(250, () => {
        request.destroy();
        retry();
      });
    };

    const retry = () => {
      if (Date.now() >= deadline) {
        reject(new Error("Servidor local nao respondeu a tempo."));
        return;
      }

      setTimeout(attempt, 40);
    };

    attempt();
  });
}

async function shutdownExternalServer() {
  try {
    await fetch(`${appUrl}/api/shutdown`, { method: "POST" });
  } catch {
    // server may already be stopping
  }
}

function shutdown(exitCode = 0) {
  if (isShuttingDown) {
    return;
  }

  isShuttingDown = true;

  if (externalServer) {
    if (keepServer) {
      process.exit(exitCode);
      return;
    }

    void shutdownExternalServer().finally(() => {
      process.exit(exitCode);
    });
    return;
  }

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
    },
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

  console.warn("Modo navegador: o icone na barra de tarefas pode ficar borrado.");
  console.warn("Prefira abrir pelo abrir-auto-orcamento.bat (janela WebView2 nativa).");

  try {
    if (externalServer) {
      await waitForServer();
    } else {
      freeTcpPortSync(appPort);
      await startServer();
    }

    openBrowserApp(browserPath);
  } catch (error) {
    console.error(error.message);
    shutdown(1);
  }
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));

main();
