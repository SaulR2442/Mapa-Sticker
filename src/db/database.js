const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');
const { DATABASE_URL } = require('../config/env');

const dbPath = DATABASE_URL.startsWith('./') || DATABASE_URL.startsWith('../')
  ? path.resolve(process.cwd(), DATABASE_URL)
  : DATABASE_URL;

fs.mkdirSync(path.dirname(dbPath), { recursive: true });

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  email         TEXT UNIQUE NOT NULL,
  username      TEXT UNIQUE NOT NULL COLLATE NOCASE,
  password_hash TEXT NOT NULL,
  display_name  TEXT NOT NULL,
  avatar        TEXT,
  bio           TEXT DEFAULT '',
  theme         TEXT DEFAULT 'light',
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS stickers (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  description TEXT DEFAULT '',
  image_url   TEXT NOT NULL,
  category    TEXT NOT NULL,
  tags        TEXT NOT NULL DEFAULT '[]',
  lat         REAL NOT NULL,
  lng         REAL NOT NULL,
  taken_at    TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_stickers_user   ON stickers(user_id);
CREATE INDEX IF NOT EXISTS idx_stickers_lat    ON stickers(lat, lng);
CREATE INDEX IF NOT EXISTS idx_stickers_cat    ON stickers(category);

CREATE TABLE IF NOT EXISTS friendships (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  requester_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  addressee_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status       TEXT NOT NULL DEFAULT 'pending',
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(requester_id, addressee_id)
);

CREATE INDEX IF NOT EXISTS idx_friendships_user ON friendships(requester_id, status);
CREATE INDEX IF NOT EXISTS idx_friendships_friend ON friendships(addressee_id, status);

CREATE TABLE IF NOT EXISTS likes (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  sticker_id INTEGER NOT NULL REFERENCES stickers(id) ON DELETE CASCADE,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(sticker_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_likes_sticker ON likes(sticker_id);
`;

db.exec(SCHEMA);

module.exports = db;
