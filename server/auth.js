const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const SESSION_COOKIE = "ao_session";
const SESSION_TTL_MS = 12 * 60 * 60 * 1000;
const GUEST_DEFAULT_TTL_MS = 24 * 60 * 60 * 1000;

/** @type {Map<string, { userId: string, username: string, role: string, expiresAt: number }>} */
const sessions = new Map();

function isAuthEnabled() {
  const value = process.env.AUTH_ENABLED;
  return value === "1" || value === "true" || value === "yes";
}

function getUsersFilePath(dataDir) {
  return path.join(dataDir, "auth-users.json");
}

function readUsersStore(dataDir) {
  const usersFile = getUsersFilePath(dataDir);
  fs.mkdirSync(dataDir, { recursive: true });

  if (!fs.existsSync(usersFile)) {
    return { users: [] };
  }

  try {
    const parsed = JSON.parse(fs.readFileSync(usersFile, "utf8"));
    return parsed && Array.isArray(parsed.users) ? parsed : { users: [] };
  } catch {
    return { users: [] };
  }
}

function writeUsersStore(dataDir, store) {
  const usersFile = getUsersFilePath(dataDir);
  fs.writeFileSync(usersFile, `${JSON.stringify(store, null, 2)}\n`, "utf8");
}

function hashSecret(secret) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(secret, salt, 64);
  return {
    salt: salt.toString("base64"),
    hash: hash.toString("base64"),
  };
}

function verifySecret(secret, stored) {
  if (!stored?.salt || !stored?.hash) {
    return false;
  }

  const salt = Buffer.from(stored.salt, "base64");
  const expected = Buffer.from(stored.hash, "base64");
  const actual = crypto.scryptSync(secret, salt, 64);

  if (expected.length !== actual.length) {
    return false;
  }

  return crypto.timingSafeEqual(actual, expected);
}

function parseCookies(header) {
  const cookies = {};

  if (!header) {
    return cookies;
  }

  for (const part of header.split(";")) {
    const trimmed = part.trim();
    const separator = trimmed.indexOf("=");

    if (separator <= 0) {
      continue;
    }

    const name = trimmed.slice(0, separator);
    const value = trimmed.slice(separator + 1);
    cookies[name] = decodeURIComponent(value);
  }

  return cookies;
}

function isSecureRequest(request) {
  return request.headers["x-forwarded-proto"] === "https";
}

function isRemoteRequest(request) {
  if (request.headers["x-forwarded-proto"] === "https") {
    return true;
  }

  return Boolean(request.headers["x-forwarded-for"]);
}

function isLocalRequest(request) {
  return isAuthEnabled() && !isRemoteRequest(request);
}

function setSessionCookie(response, token, request) {
  const parts = [
    `${SESSION_COOKIE}=${encodeURIComponent(token)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${Math.floor(SESSION_TTL_MS / 1000)}`,
  ];

  if (isSecureRequest(request)) {
    parts.push("Secure");
  }

  response.setHeader("Set-Cookie", parts.join("; "));
}

function clearSessionCookie(response, request) {
  const parts = [`${SESSION_COOKIE}=`, "Path=/", "HttpOnly", "SameSite=Lax", "Max-Age=0"];

  if (isSecureRequest(request)) {
    parts.push("Secure");
  }

  response.setHeader("Set-Cookie", parts.join("; "));
}

function createSession(user) {
  const sessionToken = crypto.randomBytes(32).toString("base64url");
  const expiresAt = Date.now() + SESSION_TTL_MS;

  sessions.set(sessionToken, {
    userId: user.id,
    label: user.label || "Acesso remoto",
    role: user.role,
    expiresAt,
  });

  return sessionToken;
}

function getSessionFromRequest(request) {
  const token = parseCookies(request.headers.cookie)[SESSION_COOKIE];

  if (!token) {
    return null;
  }

  const session = sessions.get(token);

  if (!session) {
    return null;
  }

  if (session.expiresAt <= Date.now()) {
    sessions.delete(token);
    return null;
  }

  return session;
}

function destroySession(request) {
  const token = parseCookies(request.headers.cookie)[SESSION_COOKIE];

  if (token) {
    sessions.delete(token);
  }
}

function isPublicPath(pathname) {
  if (
    pathname === "/login.html" ||
    pathname === "/login.js" ||
    pathname === "/api.js" ||
    pathname === "/styles.css"
  ) {
    return true;
  }

  if (pathname === "/api/auth/login" || pathname === "/api/auth/status") {
    return true;
  }

  return pathname.startsWith("/assets/");
}

function sanitizeGuest(guest) {
  return {
    id: guest.id,
    role: guest.role,
    label: guest.label || "",
    singleUse: Boolean(guest.singleUse),
    usedAt: guest.usedAt || null,
    expiresAt: guest.expiresAt || null,
    createdAt: guest.createdAt,
  };
}

function findUserById(store, userId) {
  return store.users.find((user) => user.id === userId) || null;
}

function generateAccessToken() {
  return crypto.randomBytes(16).toString("base64");
}

function findGuestByAccessToken(store, accessToken) {
  for (const user of store.users) {
    if (user.role !== "guest") {
      continue;
    }

    if (validateLoginCandidate(user)) {
      continue;
    }

    const storedHash = user.tokenHash || user.passwordHash;
    if (storedHash && verifySecret(accessToken, storedHash)) {
      return user;
    }
  }

  return null;
}

function ensureBootstrapAdmin() {
  // Administração é local-only; não há login de admin remoto.
}

function validateLoginCandidate(user) {
  if (!user) {
    return "Token inválido.";
  }

  if (user.singleUse && user.usedAt) {
    return "Este token já foi utilizado.";
  }

  if (user.expiresAt && Date.parse(user.expiresAt) <= Date.now()) {
    return "Este token expirou.";
  }

  return null;
}

function markUserUsed(dataDir, userId) {
  const store = readUsersStore(dataDir);
  const user = findUserById(store, userId);

  if (!user || !user.singleUse || user.usedAt) {
    return;
  }

  user.usedAt = new Date().toISOString();
  writeUsersStore(dataDir, store);
}

async function parseJsonBody(request, collectRequestBody) {
  const raw = await collectRequestBody(request);

  if (!raw.trim()) {
    return {};
  }

  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    throw new Error("JSON inválido.");
  }
}

async function handleAuthApi(request, response, pathname, dataDir, helpers) {
  const { sendJson, collectRequestBody } = helpers;

  if (pathname === "/api/auth/status" && request.method === "GET") {
    if (isLocalRequest(request)) {
      sendJson(response, 200, {
        authRequired: true,
        localAccess: true,
        authenticated: true,
        user: {
          username: "local",
          role: "local",
        },
      });
      return;
    }

    const session = getSessionFromRequest(request);
    sendJson(response, 200, {
      authRequired: true,
      localAccess: false,
      authenticated: Boolean(session),
      user: session
        ? {
            label: session.label,
            role: session.role,
          }
        : null,
    });
    return;
  }

  if (pathname === "/api/auth/login" && request.method === "POST") {
    if (isLocalRequest(request)) {
      sendJson(response, 403, { error: "Login remoto não é necessário no PC local." });
      return;
    }
    let body;

    try {
      body = await parseJsonBody(request, collectRequestBody);
    } catch (error) {
      sendJson(response, 400, { error: error.message });
      return;
    }

    const accessToken = typeof body.token === "string" ? body.token.trim() : "";

    if (!accessToken) {
      sendJson(response, 400, { error: "Informe o token de acesso." });
      return;
    }

    const store = readUsersStore(dataDir);
    const user = findGuestByAccessToken(store, accessToken);
    const validationError = validateLoginCandidate(user);

    if (validationError || !user) {
      sendJson(response, 401, { error: "Token inválido." });
      return;
    }

    if (user.singleUse) {
      markUserUsed(dataDir, user.id);
    }

    const sessionToken = createSession(user);
    setSessionCookie(response, sessionToken, request);
    sendJson(response, 200, {
      ok: true,
      user: {
        label: user.label || "Acesso remoto",
        role: user.role,
      },
    });
    return;
  }

  if (pathname === "/api/auth/logout" && request.method === "POST") {
    destroySession(request);
    clearSessionCookie(response, request);
    sendJson(response, 200, { ok: true });
    return;
  }

  if (!isLocalRequest(request)) {
    const session = getSessionFromRequest(request);

    if (!session) {
      sendJson(response, 401, { error: "Autenticação necessária.", authRequired: true });
      return;
    }

    if (pathname === "/api/auth/me" && request.method === "GET") {
      sendJson(response, 200, {
        label: session.label,
        role: session.role,
      });
      return;
    }

    sendJson(response, 403, { error: "Disponível apenas no PC local." });
    return;
  }

  if (pathname === "/api/auth/guests" && request.method === "GET") {
    const store = readUsersStore(dataDir);
    const guests = store.users
      .filter((user) => user.role === "guest")
      .map(sanitizeGuest)
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
    sendJson(response, 200, guests);
    return;
  }

  if (pathname === "/api/auth/guests" && request.method === "POST") {
    let body;

    try {
      body = await parseJsonBody(request, collectRequestBody);
    } catch (error) {
      sendJson(response, 400, { error: error.message });
      return;
    }

    const label = typeof body.label === "string" ? body.label.trim().slice(0, 80) : "";
    const expiresInHours = Number(body.expiresInHours);
    const expiresAt =
      Number.isFinite(expiresInHours) && expiresInHours > 0
        ? new Date(Date.now() + expiresInHours * 60 * 60 * 1000).toISOString()
        : new Date(Date.now() + GUEST_DEFAULT_TTL_MS).toISOString();

    const accessToken = generateAccessToken();
    const store = readUsersStore(dataDir);

    const guest = {
      id: crypto.randomUUID(),
      tokenHash: hashSecret(accessToken),
      role: "guest",
      singleUse: true,
      label: label || "Acesso temporário",
      createdAt: new Date().toISOString(),
      usedAt: null,
      expiresAt,
    };

    store.users.push(guest);
    writeUsersStore(dataDir, store);

    sendJson(response, 201, {
      guest: sanitizeGuest(guest),
      token: accessToken,
    });
    return;
  }

  const revokeMatch = pathname.match(/^\/api\/auth\/guests\/([^/]+)$/);

  if (revokeMatch && request.method === "DELETE") {
    const guestId = decodeURIComponent(revokeMatch[1]);
    const store = readUsersStore(dataDir);
    const guest = findUserById(store, guestId);

    if (!guest || guest.role !== "guest") {
      sendJson(response, 404, { error: "Convite não encontrado." });
      return;
    }

    guest.expiresAt = new Date().toISOString();
    if (!guest.usedAt) {
      guest.usedAt = new Date().toISOString();
    }

    writeUsersStore(dataDir, store);
    sendJson(response, 200, { ok: true });
    return;
  }

  sendJson(response, 404, { error: "Endpoint não encontrado." });
}

async function handleRequest(request, response, context) {
  const { dataDir, sendJson, collectRequestBody } = context;
  const url = new URL(request.url, `http://${request.headers.host}`);
  const pathname = url.pathname;

  if (pathname === "/api/auth/status" && !isAuthEnabled()) {
    sendJson(response, 200, {
      authRequired: false,
      localAccess: false,
      authenticated: true,
      user: null,
    });
    return true;
  }

  if (!isAuthEnabled()) {
    return false;
  }

  if (pathname.startsWith("/api/auth/")) {
    await handleAuthApi(request, response, pathname, dataDir, { sendJson, collectRequestBody });
    return true;
  }

  if (isLocalRequest(request)) {
    request.authLocalAccess = true;
    return false;
  }

  if (isPublicPath(pathname)) {
    return false;
  }

  const session = getSessionFromRequest(request);

  if (!session || session.role !== "guest") {
    if (pathname.startsWith("/api/")) {
      sendJson(response, 401, { error: "Autenticação necessária.", authRequired: true });
    } else {
      const next = encodeURIComponent(`${pathname}${url.search}`);
      response.writeHead(302, { Location: `/login.html?next=${next}` });
      response.end();
    }

    return true;
  }

  request.authSession = session;
  return false;
}

function canShutdown(request) {
  if (!isAuthEnabled()) {
    return true;
  }

  return isLocalRequest(request);
}

module.exports = {
  isAuthEnabled,
  isLocalRequest,
  isRemoteRequest,
  ensureBootstrapAdmin,
  handleRequest,
  getSessionFromRequest,
  canShutdown,
  destroySession,
  clearSessionCookie,
};
