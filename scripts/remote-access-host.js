const { spawn, spawnSync } = require("node:child_process");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const readline = require("node:readline");
const { freeTcpPortSync, isPortInUseSync } = require("../server/port-utils");

const rootDir = path.join(__dirname, "..");
const appPort = 3000;
const appUrl = `http://127.0.0.1:${appPort}`;

let serverProcess = null;
let cleanedUp = false;

function log(message = "") {
  process.stdout.write(`${message}\n`);
}

function runCommand(command, args, options = {}) {
  return spawnSync(command, args, {
    cwd: rootDir,
    encoding: "utf8",
    windowsHide: true,
    ...options,
  });
}

function waitForServer(timeoutMs = 20000) {
  const deadline = Date.now() + timeoutMs;

  return new Promise((resolve, reject) => {
    const attempt = () => {
      const request = http.get(`${appUrl}/api/auth/status`, (response) => {
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

      setTimeout(attempt, 100);
    };

    attempt();
  });
}

function startServer() {
  if (isPortInUseSync(appPort)) {
    freeTcpPortSync(appPort);
  }

  serverProcess = spawn(process.execPath, [path.join(rootDir, "server", "server.js")], {
    cwd: rootDir,
    env: {
      ...process.env,
      AUTH_ENABLED: "1",
    },
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  });

  serverProcess.stdout.on("data", (chunk) => {
    process.stdout.write(chunk);
  });

  serverProcess.stderr.on("data", (chunk) => {
    process.stderr.write(chunk);
  });

  serverProcess.on("exit", (code) => {
    if (!cleanedUp && code !== 0 && code !== null) {
      log(`\nServidor encerrou com codigo ${code}.`);
    }
  });
}

function startFunnel() {
  const result = runCommand("tailscale", ["funnel", "--bg", String(appPort)], {
    stdio: ["ignore", "pipe", "pipe"],
  });

  if (result.stdout) {
    log(result.stdout.trimEnd());
  }

  if (result.stderr) {
    log(result.stderr.trimEnd());
  }

  return result.status === 0;
}

function showFunnelStatus() {
  const result = runCommand("tailscale", ["funnel", "status"], {
    stdio: ["ignore", "pipe", "pipe"],
  });

  if (result.stdout) {
    log(result.stdout.trimEnd());
  }
}

function openAppWindow() {
  const launcherScript = path.join(rootDir, "launcher", "native_launcher.py");
  const launchAppScript = path.join(rootDir, "launcher", "launch-app.js");
  const pythonw = runCommand("where", ["pythonw"], { stdio: ["ignore", "pipe", "ignore"] });

  if (pythonw.status === 0 && fs.existsSync(launcherScript)) {
    spawn("pythonw", [launcherScript, "--external-server", "--keep-server"], {
      cwd: rootDir,
      detached: true,
      stdio: "ignore",
      windowsHide: true,
    }).unref();
    return;
  }

  spawn(process.execPath, [launchAppScript, "--external-server", "--keep-server"], {
    cwd: rootDir,
    detached: true,
    stdio: "ignore",
    windowsHide: true,
  }).unref();
}

function cleanup() {
  if (cleanedUp) {
    return;
  }

  cleanedUp = true;
  log("\nEncerrando acesso remoto...");

  runCommand("tailscale", ["funnel", "reset"], { stdio: "ignore" });

  if (serverProcess && !serverProcess.killed) {
    serverProcess.kill();
  }

  freeTcpPortSync(appPort);
}

function attachShutdownHandlers(rl) {
  const shutdown = (exitCode = 0) => {
    cleanup();
    if (rl) {
      rl.close();
    }
    process.exit(exitCode);
  };

  process.on("SIGINT", () => shutdown(0));
  process.on("SIGTERM", () => shutdown(0));

  if (process.platform === "win32") {
    process.on("SIGBREAK", () => shutdown(0));
  }
}

function waitForQuit() {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    attachShutdownHandlers(rl);

    log("");
    log("Pressione Q para encerrar o acesso remoto.");
    log("Fechar este terminal tambem encerra servidor e Funnel.");
    log("Fechar a janela do app nao afeta o servidor.");
    log("");

    const onLine = (line) => {
      if (line.trim().toLowerCase() === "q") {
        rl.off("line", onLine);
        rl.close();
        cleanup();
        resolve();
      }
    };

    rl.on("line", onLine);
  });
}

async function main() {
  log("");
  log("Iniciando Auto Orcamento com autenticacao remota...");

  startServer();

  try {
    await waitForServer();
  } catch (error) {
    cleanup();
    log(error.message);
    process.exit(1);
  }

  log("Ativando Tailscale Funnel...");
  const funnelOk = startFunnel();

  if (!funnelOk) {
    log("");
    log("Falha ao ativar o Funnel. Execute este terminal como Administrador.");
    log("O servidor local continua em http://127.0.0.1:3000");
    openAppWindow();
    await waitForQuit();
    process.exit(1);
  }

  log("");
  showFunnelStatus();
  log("");
  log("Acesso remoto: use a URL HTTPS acima com token de convidado.");
  log("Gerenciamento local: http://127.0.0.1:3000");

  openAppWindow();
  await waitForQuit();
  process.exit(0);
}

void main().catch((error) => {
  cleanup();
  log(error.message);
  process.exit(1);
});
