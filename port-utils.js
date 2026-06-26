const { execSync } = require("node:child_process");

function freeTcpPort(port) {
  if (process.platform !== "win32") {
    return;
  }

  try {
    const output = execSync("netstat -ano -p tcp", { encoding: "utf8", windowsHide: true });
    const currentPid = String(process.pid);

    for (const line of output.split(/\r?\n/)) {
      if (!line.includes(`:${port}`) || !/LISTENING/i.test(line)) {
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
    // ignore netstat failures
  }
}

module.exports = {
  freeTcpPort,
};
