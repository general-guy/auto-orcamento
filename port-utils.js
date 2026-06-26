const { execSync } = require("node:child_process");
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

  try {
    execSync(
      `powershell -NoProfile -Command "$c=New-Object Net.Sockets.TcpClient; try{$c.Connect('127.0.0.1',${port});$c.Close();exit 0}catch{exit 1}"`,
      { stdio: "ignore", windowsHide: true, timeout: 500 },
    );
  } catch {
    return;
  }

  killProcessOnPort(port);
}

module.exports = {
  freeTcpPort,
  freeTcpPortSync,
  isPortInUse,
};
