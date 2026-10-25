const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { promisify } = require("node:util");
const { DatabaseSync } = require("node:sqlite");

const scrypt = promisify(crypto.scrypt);
const databasePath = process.env.DATABASE_PATH || path.join(__dirname, "..", "data", "cineverse.sqlite");
fs.mkdirSync(path.dirname(databasePath), { recursive: true });

const database = new DatabaseSync(databasePath);
database.exec(`
  PRAGMA foreign_keys = ON;
  PRAGMA journal_mode = WAL;
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE COLLATE NOCASE,
    password_hash TEXT NOT NULL,
    password_salt TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS sessions (
    token_hash TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON sessions(user_id);
`);
database.prepare("DELETE FROM sessions WHERE expires_at <= ?").run(Date.now());

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const PASSWORD_KEY_LENGTH = 64;

function publicUser(user) {
  if (!user) return null;
  return { id: user.id, name: user.name, email: user.email, createdAt: user.created_at };
}

async function hashPassword(password, salt) {
  const derivedKey = await scrypt(password, salt, PASSWORD_KEY_LENGTH);
  return derivedKey.toString("hex");
}

async function createUser({ name, email, password }) {
  const id = crypto.randomUUID();
  const salt = crypto.randomBytes(16).toString("hex");
  const passwordHash = await hashPassword(password, salt);
  database.prepare(
    "INSERT INTO users (id, name, email, password_hash, password_salt) VALUES (?, ?, ?, ?, ?)"
  ).run(id, name.trim(), email.trim().toLowerCase(), passwordHash, salt);
  return publicUser(database.prepare("SELECT * FROM users WHERE id = ?").get(id));
}

async function verifyUser(email, password) {
  const user = database.prepare("SELECT * FROM users WHERE email = ? COLLATE NOCASE").get(email.trim());
  if (!user) return null;
  const candidate = Buffer.from(await hashPassword(password, user.password_salt), "hex");
  const expected = Buffer.from(user.password_hash, "hex");
  if (candidate.length !== expected.length || !crypto.timingSafeEqual(candidate, expected)) return null;
  return publicUser(user);
}

function createSession(userId) {
  const token = crypto.randomBytes(32).toString("base64url");
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const expiresAt = Date.now() + SESSION_TTL_MS;
  database.prepare("INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)")
    .run(tokenHash, userId, expiresAt);
  return { token, expiresAt };
}

function getUserForSession(token) {
  if (!token) return null;
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const row = database.prepare(`
    SELECT users.* FROM sessions
    JOIN users ON users.id = sessions.user_id
    WHERE sessions.token_hash = ? AND sessions.expires_at > ?
  `).get(tokenHash, Date.now());
  return publicUser(row);
}

function deleteSession(token) {
  if (!token) return;
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  database.prepare("DELETE FROM sessions WHERE token_hash = ?").run(tokenHash);
}

module.exports = { createUser, verifyUser, createSession, getUserForSession, deleteSession, SESSION_TTL_MS };
