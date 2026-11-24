export const SCHEMA_VERSION = 1;

export const SCHEMA_SQL = `
PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS users (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  username        TEXT NOT NULL UNIQUE,
  display_name    TEXT NOT NULL,
  salt            TEXT NOT NULL,
  password_hash   TEXT NOT NULL,
  failed_attempts INTEGER NOT NULL DEFAULT 0,
  locked_until    INTEGER,
  created_at      INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS walks (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  notes       TEXT NOT NULL DEFAULT '',
  started_at  INTEGER NOT NULL,
  duration_s  INTEGER NOT NULL,
  distance_m  REAL NOT NULL,
  route_json  TEXT NOT NULL DEFAULT '[]',
  photo_uri   TEXT,
  weather_json TEXT
);
CREATE INDEX IF NOT EXISTS idx_walks_user_started ON walks(user_id, started_at DESC);
`;
