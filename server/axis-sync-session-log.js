const fs = require("node:fs");
const path = require("node:path");

const MAX_SESSION_FILES = 10;
const SESSION_GLOB_PREFIX = "session-";

function resolveAxisSyncLogDir(dataDir) {
  if (!dataDir) {
    return null;
  }
  return path.join(path.dirname(dataDir), "logs", "axis-sync");
}

function sanitizeLabel(label) {
  const safe = String(label || "sync")
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return safe || "sync";
}

function pad2(value) {
  return String(value).padStart(2, "0");
}

function pad3(value) {
  return String(value).padStart(3, "0");
}

/** ISO-8601 com offset local (ex.: 2026-10-26T14:22:56.329-03:00). */
function formatLocalDateTime(date = new Date()) {
  const offsetMinutes = -date.getTimezoneOffset();
  const sign = offsetMinutes >= 0 ? "+" : "-";
  const abs = Math.abs(offsetMinutes);
  const offset = `${sign}${pad2(Math.floor(abs / 60))}:${pad2(abs % 60)}`;
  return (
    `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}` +
    `T${pad2(date.getHours())}:${pad2(date.getMinutes())}:${pad2(date.getSeconds())}.` +
    `${pad3(date.getMilliseconds())}${offset}`
  );
}

function resolveLocalTimeZoneLabel() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "local";
  } catch {
    return "local";
  }
}

/** Nome de arquivo session-* (sem ':' — legível no Explorer). */
function formatSessionTimestamp(date = new Date()) {
  const offsetMinutes = -date.getTimezoneOffset();
  const sign = offsetMinutes >= 0 ? "p" : "m";
  const abs = Math.abs(offsetMinutes);
  const tzCompact = `${sign}${pad2(Math.floor(abs / 60))}${pad2(abs % 60)}`;
  return (
    `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}` +
    `T${pad2(date.getHours())}-${pad2(date.getMinutes())}-${pad2(date.getSeconds())}-` +
    `${pad3(date.getMilliseconds())}-${tzCompact}`
  );
}

function listSessionLogFiles(logDir) {
  if (!fs.existsSync(logDir)) {
    return [];
  }
  return fs
    .readdirSync(logDir, { withFileTypes: true })
    .filter(
      (entry) =>
        entry.isFile() &&
        entry.name.startsWith(SESSION_GLOB_PREFIX) &&
        entry.name.endsWith(".log"),
    )
    .map((entry) => {
      const absolute = path.join(logDir, entry.name);
      let mtimeMs = 0;
      try {
        mtimeMs = fs.statSync(absolute).mtimeMs;
      } catch {
        // ignore
      }
      return { absolute, mtimeMs };
    })
    .sort((a, b) => a.mtimeMs - b.mtimeMs);
}

function pruneOldSessions(logDir) {
  const files = listSessionLogFiles(logDir);
  while (files.length >= MAX_SESSION_FILES) {
    const oldest = files.shift();
    try {
      fs.unlinkSync(oldest.absolute);
    } catch {
      break;
    }
  }
}

function createAxisSyncSessionLogger(logDir, { taskName, argv, scriptPath }) {
  if (!logDir) {
    return {
      logLine() {},
      logChunk() {},
      finish() {},
      filePath: null,
    };
  }

  fs.mkdirSync(logDir, { recursive: true });
  pruneOldSessions(logDir);

  const stamp = formatSessionTimestamp();
  const fileName = `${SESSION_GLOB_PREFIX}${stamp}-${sanitizeLabel(taskName)}.log`;
  const filePath = path.join(logDir, fileName);
  const startedAt = formatLocalDateTime();
  const timeZone = resolveLocalTimeZoneLabel();
  const argvText = (argv || []).map((part) => JSON.stringify(part)).join(" ");
  const header = [
    "# axis-sync session",
    `started_at=${startedAt}`,
    `timezone=${timeZone}`,
    `task=${taskName || "sync"}`,
    `script=${scriptPath}`,
    `argv=${argvText}`,
    `command=py -3 ${JSON.stringify(scriptPath)} ${argvText}`,
    "---",
    "",
  ].join("\n");
  fs.writeFileSync(filePath, header, "utf8");

  function append(text) {
    if (!text) {
      return;
    }
    try {
      fs.appendFileSync(filePath, text, "utf8");
    } catch (error) {
      console.error(`[axis-sync] falha ao gravar log: ${error.message}`);
    }
  }

  return {
    filePath,
    logLine(stream, line) {
      const prefix = stream === "stderr" ? "[stderr] " : "";
      append(`${prefix}${line}\n`);
    },
    logChunk(stream, chunk) {
      const text = chunk.toString("utf8");
      if (!text) {
        return;
      }
      if (stream === "stderr") {
        for (const line of text.split(/\r?\n/)) {
          if (line.length) {
            append(`[stderr] ${line}\n`);
          }
        }
        return;
      }
      append(text);
    },
    finish(exitCode, { timedOut = false, spawnError = null } = {}) {
      const lines = [
        "---",
        `finished_at=${formatLocalDateTime()}`,
        `exit_code=${exitCode}`,
      ];
      if (timedOut) {
        lines.push("result=timeout");
      }
      if (spawnError) {
        lines.push(`spawn_error=${spawnError}`);
      }
      lines.push("");
      append(lines.join("\n"));
    },
  };
}

module.exports = {
  MAX_SESSION_FILES,
  resolveAxisSyncLogDir,
  createAxisSyncSessionLogger,
};
