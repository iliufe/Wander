import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { pbkdf2Sync, randomBytes, timingSafeEqual } from "node:crypto";
import pg from "pg";

const currentDir = dirname(fileURLToPath(import.meta.url));
const workspaceRoot = resolve(currentDir, "..");
const defaultDatabasePath = resolve(workspaceRoot, "data", "wander-users.json");
const databasePath = resolve(process.env.WANDER_USER_DB_PATH || defaultDatabasePath);
const passwordIterations = 120000;
const passwordKeyLength = 32;
const passwordDigest = "sha256";
const sessionTtlMs = 1000 * 60 * 60 * 24 * 14;

let databaseCache = null;
let pgPool = null;
let pgReady = false;

export async function registerUser({ email, password, name }) {
  const safeEmail = normalizeEmail(email);
  const safePassword = normalizePassword(password);
  if (!safeEmail || safePassword.length < 7) {
    throw createPublicError("Valid email and a password longer than 6 characters are required.", 400);
  }

  if (hasPostgres()) {
    return registerUserWithPostgres({ email: safeEmail, password: safePassword, name });
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

export async function loginUser({ email, password }) {
  const safeEmail = normalizeEmail(email);
  const safePassword = normalizePassword(password);
  if (hasPostgres()) {
    return loginUserWithPostgres({ email: safeEmail, password: safePassword });
  }

  const database = readDatabase();
  const user = database.users.find((item) => item.email === safeEmail);
  if (!user || !verifyPassword(safePassword, user.passwordHash)) {
    throw createPublicError("The account or password is incorrect.", 401);
  }

  return createSessionForUser(user.id);
}

export async function getUserBySessionToken(token) {
  const safeToken = normalizeLine(token);
  if (!safeToken) {
    return null;
  }

  if (hasPostgres()) {
    return getUserBySessionTokenWithPostgres(safeToken);
  }

  const database = readDatabase();
  const session = database.sessions.find((item) => item.token === safeToken);
  if (!session || Date.parse(session.expiresAt) <= Date.now()) {
    return null;
  }

  const user = database.users.find((item) => item.id === session.userId);
  return user || null;
}

export async function updateUserProfileBySession(token, profile) {
  if (hasPostgres()) {
    return updateUserProfileWithPostgres(token, profile);
  }

  const user = await getUserBySessionToken(token);
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

export async function deleteSession(token) {
  const safeToken = normalizeLine(token);
  if (!safeToken) {
    return;
  }

  if (hasPostgres()) {
    const pool = await getPostgresPool();
    await pool.query("DELETE FROM wander_sessions WHERE token = $1", [safeToken]);
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

export function getUserStoreMode() {
  return hasPostgres() ? "postgres" : "file";
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

async function registerUserWithPostgres({ email, password, name }) {
  const pool = await getPostgresPool();
  const now = new Date();
  const user = {
    id: createId("usr"),
    email,
    passwordHash: hashPassword(password),
    name: normalizeLine(name) || "Wander User",
    gender: "private",
    profession: "student",
    avatarDataUrl: null,
    hasCompletedOnboarding: false,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };

  try {
    const result = await pool.query(
      `INSERT INTO wander_users (
        id, email, password_hash, name, gender, profession, avatar_data_url,
        has_completed_onboarding, created_at, updated_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
      RETURNING *`,
      [
        user.id,
        user.email,
        user.passwordHash,
        user.name,
        user.gender,
        user.profession,
        user.avatarDataUrl,
        user.hasCompletedOnboarding,
        now,
        now,
      ]
    );
    return createPostgresSessionForUser(mapPostgresUser(result.rows[0]));
  } catch (error) {
    if (error?.code === "23505") {
      throw createPublicError("This account already exists.", 409);
    }
    throw error;
  }
}

async function loginUserWithPostgres({ email, password }) {
  const pool = await getPostgresPool();
  const result = await pool.query("SELECT * FROM wander_users WHERE email = $1 LIMIT 1", [email]);
  const user = result.rows[0] ? mapPostgresUser(result.rows[0]) : null;
  if (!user || !verifyPassword(password, user.passwordHash)) {
    throw createPublicError("The account or password is incorrect.", 401);
  }

  return createPostgresSessionForUser(user);
}

async function getUserBySessionTokenWithPostgres(token) {
  const pool = await getPostgresPool();
  const result = await pool.query(
    `SELECT u.*
     FROM wander_sessions s
     JOIN wander_users u ON u.id = s.user_id
     WHERE s.token = $1 AND s.expires_at > NOW()
     LIMIT 1`,
    [token]
  );
  return result.rows[0] ? mapPostgresUser(result.rows[0]) : null;
}

async function updateUserProfileWithPostgres(token, profile) {
  const user = await getUserBySessionTokenWithPostgres(normalizeLine(token));
  if (!user) {
    throw createPublicError("You need to sign in again.", 401);
  }

  const pool = await getPostgresPool();
  const nextEmail = profile.email != null ? normalizeEmail(profile.email) : user.email;
  if (!nextEmail) {
    throw createPublicError("Email cannot be empty.", 400);
  }

  const nextUser = {
    email: nextEmail,
    name: profile.name != null ? normalizeLine(profile.name) || user.name : user.name,
    gender: normalizeChoice(profile.gender, ["male", "female", "private"], user.gender),
    profession: normalizeChoice(
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
      user.profession
    ),
    avatarDataUrl:
      profile.avatarDataUrl === null || typeof profile.avatarDataUrl === "string"
        ? profile.avatarDataUrl
        : user.avatarDataUrl,
    hasCompletedOnboarding:
      typeof profile.hasCompletedOnboarding === "boolean"
        ? profile.hasCompletedOnboarding
        : user.hasCompletedOnboarding,
  };

  try {
    const result = await pool.query(
      `UPDATE wander_users
       SET email = $2,
           name = $3,
           gender = $4,
           profession = $5,
           avatar_data_url = $6,
           has_completed_onboarding = $7,
           updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [
        user.id,
        nextUser.email,
        nextUser.name,
        nextUser.gender,
        nextUser.profession,
        nextUser.avatarDataUrl,
        nextUser.hasCompletedOnboarding,
      ]
    );
    return mapPostgresUser(result.rows[0]);
  } catch (error) {
    if (error?.code === "23505") {
      throw createPublicError("This email is already used by another account.", 409);
    }
    throw error;
  }
}

async function createPostgresSessionForUser(user) {
  const pool = await getPostgresPool();
  const now = Date.now();
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(now + sessionTtlMs);
  await pool.query("DELETE FROM wander_sessions WHERE expires_at <= NOW()");
  await pool.query(
    `INSERT INTO wander_sessions (token, user_id, created_at, expires_at)
     VALUES ($1, $2, NOW(), $3)`,
    [token, user.id, expiresAt]
  );
  return { token, user };
}

async function getPostgresPool() {
  if (!pgPool) {
    pgPool = new pg.Pool({
      connectionString: getDatabaseUrl(),
      ssl: shouldUsePostgresSsl() ? { rejectUnauthorized: false } : undefined,
      max: Number(process.env.POSTGRES_POOL_MAX || 5),
    });
  }

  if (!pgReady) {
    await ensurePostgresSchema(pgPool);
    pgReady = true;
  }

  return pgPool;
}

async function ensurePostgresSchema(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS wander_users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL DEFAULT 'Wander User',
      gender TEXT NOT NULL DEFAULT 'private',
      profession TEXT NOT NULL DEFAULT 'student',
      avatar_data_url TEXT,
      has_completed_onboarding BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS wander_sessions (
      token TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES wander_users(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      expires_at TIMESTAMPTZ NOT NULL
    );
  `);
  await pool.query("CREATE INDEX IF NOT EXISTS idx_wander_sessions_user_id ON wander_sessions(user_id);");
  await pool.query("CREATE INDEX IF NOT EXISTS idx_wander_sessions_expires_at ON wander_sessions(expires_at);");
}

function mapPostgresUser(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    email: row.email,
    passwordHash: row.password_hash,
    name: row.name,
    gender: row.gender,
    profession: row.profession,
    avatarDataUrl: row.avatar_data_url,
    hasCompletedOnboarding: row.has_completed_onboarding,
    createdAt: row.created_at?.toISOString?.() || row.created_at,
    updatedAt: row.updated_at?.toISOString?.() || row.updated_at,
  };
}

function hasPostgres() {
  return Boolean(getDatabaseUrl());
}

function shouldUsePostgresSsl() {
  if (process.env.POSTGRES_SSL === "false") {
    return false;
  }

  return getDatabaseUrl().includes("render.com") || process.env.NODE_ENV === "production";
}

function getDatabaseUrl() {
  return process.env.DATABASE_URL || process.env.POSTGRES_URL || "";
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
