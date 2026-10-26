const fs = require("node:fs");
const path = require("node:path");

const NOTIFY_ENV_KEYS = new Set([
  "AUTO_ORCAMENTO_ATLAS_NOTIFY_TOKEN",
  "AUTO_ORCAMENTO_ATLAS_NOTIFY_BIND_HOST",
  "AUTO_ORCAMENTO_ATLAS_NOTIFY_PORT",
  "AUTO_ORCAMENTO_ATLAS_NOTIFY_URL",
]);

const WINDOWS_NOTIFY_ENV_FILE = path.join("C:", "auto-orcamento", "config", "atlas-notify.env");

function applyEnvLine(line) {
  const trimmed = String(line || "").trim();
  if (!trimmed || trimmed.startsWith("#")) {
    return;
  }
  const separator = trimmed.indexOf("=");
  if (separator <= 0) {
    return;
  }
  const key = trimmed.slice(0, separator).trim();
  const value = trimmed.slice(separator + 1).trim();
  if (!NOTIFY_ENV_KEYS.has(key) || !value || process.env[key]) {
    return;
  }
  process.env[key] = value;
}

function loadAtlasNotifyEnv() {
  if (process.platform !== "win32") {
    return;
  }
  if (!fs.existsSync(WINDOWS_NOTIFY_ENV_FILE)) {
    return;
  }
  const text = fs.readFileSync(WINDOWS_NOTIFY_ENV_FILE, "utf8");
  for (const line of text.split(/\r?\n/)) {
    applyEnvLine(line);
  }
}

module.exports = {
  loadAtlasNotifyEnv,
  WINDOWS_NOTIFY_ENV_FILE,
};
