import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { pbkdf2Sync, randomBytes, timingSafeEqual } from "node:crypto";

const currentDir = dirname(fileURLToPath(import.meta.url));
const workspaceRoot = resolve(currentDir, "..");
const defaultDatabasePath = resolve(workspaceRoot, "data", "wander-users.json");
const databasePath = resolve(process.env.WANDER_USER_DB_PATH || defaultDatabasePath);
const passwordIterations = 120000;
const passwordKeyLength = 32;
const passwordDigest = "sha256";
const sessionTtlMs = 1000 * 60 * 60 * 24 * 14;

let databaseCache = null;

export function registerUser({ email, password, name }) {
  const safeEmail = normalizeEmail(email);
  const safePassword = normalizePassword(password);
  if (!safeEmail || safePassword.length < 7) {
    throw createPublicError("Valid email and a password longer than 6 characters are required.", 400);
  }

  const database = readDatabase();
  if (database.users.some((user) => user.email === safeEmail)) {
    throw createPublicError("This account already exists.", 409);
  }

  const now = new Date().toISOString();
  const user = {
    id: createId("usr"),
    email: safeEmail,
    passwordHash: hashPassword(safePassword),
    name: normalizeLine(name) || "Wander User",
    gender: "private",
    profession: "student",
    avatarDataUrl: null,
    hasCompletedOnboarding: false,
    createdAt: now,
    updatedAt: now,
  };

  database.users.push(user);
  writeDatabase(database);
  return createSessionForUser(user.id);
}

export function loginUser({ email, password }) {
  const safeEmail = normalizeEmail(email);
  const safePassword = normalizePassword(password);
  const database = readDatabase();
  const user = database.users.find((item) => item.email === safeEmail);
  if (!user || !verifyPassword(safePassword, user.passwordHash)) {
    throw createPublicError("The account or password is incorrect.", 401);
  }

  return createSessionForUser(user.id);
}

export function getUserBySessionToken(token) {
  const safeToken = normalizeLine(token);
  if (!safeToken) {
    return null;
  }

  const database = readDatabase();
  const session = database.sessions.find((item) => item.token === safeToken);
  if (!session || Date.parse(session.expiresAt) <= Date.now()) {
    return null;
  }

  const user = database.users.find((item) => item.id === session.userId);
  return user || null;
}

export function updateUserProfileBySession(token, profile) {
  const user = getUserBySessionToken(token);
  if (!user) {
    throw createPublicError("You need to sign in again.", 401);
  }

  const database = readDatabase();
  const storedUser = database.users.find((item) => item.id === user.id);
  if (!storedUser) {
    throw createPublicError("User not found.", 404);
  }

  const nextEmail = profile.email != null ? normalizeEmail(profile.email) : storedUser.email;
  if (!nextEmail) {
    throw createPublicError("Email cannot be empty.", 400);
  }

  if (
    nextEmail !== storedUser.email &&
    database.users.some((item) => item.email === nextEmail && item.id !== storedUser.id)
  ) {
    throw createPublicError("This email is already used by another account.", 409);
  }

  storedUser.email = nextEmail;
  storedUser.name = profile.name != null ? normalizeLine(profile.name) || storedUser.name : storedUser.name;
  storedUser.gender = normalizeChoice(profile.gender, ["male", "female", "private"], storedUser.gender);
  storedUser.profession = normalizeChoice(
    profile.profession,
    [
      "student",
      "teacher",
      "engineer",
      "designer",
      "product",
      "marketing",
      "finance",
      "healthcare",
      "service",
      "freelancer",
      "other",
    ],
    storedUser.profession
  );
  if (profile.avatarDataUrl === null || typeof profile.avatarDataUrl === "string") {
    storedUser.avatarDataUrl = profile.avatarDataUrl;
  }
  if (typeof profile.hasCompletedOnboarding === "boolean") {
    storedUser.hasCompletedOnboarding = profile.hasCompletedOnboarding;
  }
  storedUser.updatedAt = new Date().toISOString();
  writeDatabase(database);
  return storedUser;
}

export function deleteSession(token) {
  const safeToken = normalizeLine(token);
  if (!safeToken) {
    return;
  }

  const database = readDatabase();
  database.sessions = database.sessions.filter((session) => session.token !== safeToken);
  writeDatabase(database);
}

export function toPublicUser(user) {
  if (!user) {
    return null;
  }

  return {
    isAuthenticated: true,
    hasCompletedOnboarding: Boolean(user.hasCompletedOnboarding),
    name: user.name || "Wander User",
    email: user.email,
    password: "",
    gender: user.gender || "private",
    profession: user.profession || "student",
    avatarDataUrl: user.avatarDataUrl || null,
  };
}

export function createPublicError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.publicMessage = message;
  return error;
}

function createSessionForUser(userId) {
  const database = readDatabase();
  const now = Date.now();
  const token = randomBytes(32).toString("base64url");
  database.sessions = database.sessions.filter((session) => Date.parse(session.expiresAt) > now);
  database.sessions.push({
    token,
    userId,
    createdAt: new Date(now).toISOString(),
    expiresAt: new Date(now + sessionTtlMs).toISOString(),
  });
  writeDatabase(database);
  const user = database.users.find((item) => item.id === userId);
  return { token, user };
}

function readDatabase() {
  if (databaseCache) {
    return databaseCache;
  }

  if (!existsSync(databasePath)) {
    databaseCache = { version: 1, users: [], sessions: [] };
    writeDatabase(databaseCache);
    return databaseCache;
  }

  try {
    const parsed = JSON.parse(readFileSync(databasePath, "utf8"));
    databaseCache = {
      version: 1,
      users: Array.isArray(parsed.users) ? parsed.users : [],
      sessions: Array.isArray(parsed.sessions) ? parsed.sessions : [],
    };
    return databaseCache;
  } catch {
    databaseCache = { version: 1, users: [], sessions: [] };
    writeDatabase(databaseCache);
    return databaseCache;
  }
}

function writeDatabase(database) {
  mkdirSync(dirname(databasePath), { recursive: true });
  writeFileSync(databasePath, `${JSON.stringify(database, null, 2)}\n`, "utf8");
  databaseCache = database;
}

function hashPassword(password) {
  const salt = randomBytes(16).toString("base64url");
  const hash = pbkdf2Sync(password, salt, passwordIterations, passwordKeyLength, passwordDigest).toString("base64url");
  return `pbkdf2$${passwordIterations}$${salt}$${hash}`;
}

function verifyPassword(password, storedHash) {
  const [, iterationsText, salt, expectedHash] = String(storedHash || "").split("$");
  const iterations = Number(iterationsText);
  if (!iterations || !salt || !expectedHash) {
    return false;
  }

  const actualHash = pbkdf2Sync(password, salt, iterations, passwordKeyLength, passwordDigest);
  const expectedBuffer = Buffer.from(expectedHash, "base64url");
  if (actualHash.length !== expectedBuffer.length) {
    return false;
  }

  return timingSafeEqual(actualHash, expectedBuffer);
}

function createId(prefix) {
  return `${prefix}_${randomBytes(12).toString("hex")}`;
}

function normalizeEmail(value) {
  return normalizeLine(value).toLowerCase();
}

function normalizePassword(value) {
  return typeof value === "string" ? value : "";
}

function normalizeLine(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeChoice(value, allowedValues, fallback) {
  return allowedValues.includes(value) ? value : fallback;
}
