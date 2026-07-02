const { execSync, spawnSync } = require("node:child_process");
const net = require("node:net");

function isPortInUse(port, host = "127.0.0.1") {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(250);

    const finish = (inUse) => {
      socket.destroy();
      resolve(inUse);
    };

    socket.once("connect", () => finish(true));
    socket.once("timeout", () => finish(false));
    socket.once("error", () => finish(false));
    socket.connect(port, host);
  });
}

function isPortInUseSync(port, host = "127.0.0.1", timeoutMs = 200) {
  const script = [
    "const n=require('net');",
    `const p=${port};const h='${host}';`,
    `const t=setTimeout(()=>process.exit(2),${timeoutMs});`,
    "const s=n.connect({port:p,host:h},()=>{clearTimeout(t);process.exit(0)});",
    "s.on('error',()=>{clearTimeout(t);process.exit(1)});",
  ].join("");

  const result = spawnSync(process.execPath, ["-e", script], {
    stdio: "ignore",
    windowsHide: true,
    timeout: timeoutMs + 150,
  });

  return result.status === 0;
}

function killProcessOnPort(port) {
  if (process.platform !== "win32") {
    return;
  }

  try {
    const output = execSync(`netstat -ano -p tcp | findstr :${port} | findstr LISTENING`, {
      encoding: "utf8",
      windowsHide: true,
    });
    const currentPid = String(process.pid);

    for (const line of output.split(/\r?\n/)) {
      if (!line.trim()) {
        continue;
      }

      const pid = line.trim().split(/\s+/).pop();
      if (!pid || !/^\d+$/.test(pid) || pid === currentPid) {
        continue;
      }

      try {
        execSync(`taskkill /F /PID ${pid}`, { stdio: "ignore", windowsHide: true });
      } catch {
        // process may have already exited
      }
    }
  } catch {
    // port not in use or findstr found nothing
  }
}

async function freeTcpPort(port) {
  if (process.platform !== "win32") {
    return;
  }

  if (!(await isPortInUse(port))) {
    return;
  }

  killProcessOnPort(port);
}

function freeTcpPortSync(port) {
  if (process.platform !== "win32") {
    return;
  }

  if (!isPortInUseSync(port)) {
    return;
  }

  killProcessOnPort(port);
}

module.exports = {
  freeTcpPort,
  freeTcpPortSync,
  isPortInUse,
  isPortInUseSync,
};
