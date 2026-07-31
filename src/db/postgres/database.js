const { Pool } = require('pg');
const { DATABASE_URL } = require('../../config/env');

const pool = new Pool({
  connectionString: DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30000,
});

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id            BIGSERIAL PRIMARY KEY,
  email         TEXT UNIQUE NOT NULL,
  username      TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  display_name  TEXT NOT NULL,
  avatar        TEXT,
  bio           TEXT NOT NULL DEFAULT '',
  theme         TEXT NOT NULL DEFAULT 'light',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS stickers (
  id          BIGSERIAL PRIMARY KEY,
  user_id     BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  image_url   TEXT NOT NULL,
  category    TEXT NOT NULL,
  tags        TEXT NOT NULL DEFAULT '[]',
  lat         DOUBLE PRECISION NOT NULL,
  lng         DOUBLE PRECISION NOT NULL,
  taken_at    TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_stickers_user ON stickers(user_id);
CREATE INDEX IF NOT EXISTS idx_stickers_lat  ON stickers(lat, lng);
CREATE INDEX IF NOT EXISTS idx_stickers_cat  ON stickers(category);

CREATE TABLE IF NOT EXISTS friendships (
  id           BIGSERIAL PRIMARY KEY,
  requester_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  addressee_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status       TEXT NOT NULL DEFAULT 'pending',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(requester_id, addressee_id)
);

CREATE INDEX IF NOT EXISTS idx_friendships_user   ON friendships(requester_id, status);
CREATE INDEX IF NOT EXISTS idx_friendships_friend ON friendships(addressee_id, status);

CREATE TABLE IF NOT EXISTS likes (
  id         BIGSERIAL PRIMARY KEY,
  sticker_id BIGINT NOT NULL REFERENCES stickers(id) ON DELETE CASCADE,
  user_id    BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(sticker_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_likes_sticker ON likes(sticker_id);
`;

let initialized = false;

async function init() {
  if (initialized) return;
  await pool.query(SCHEMA);
  initialized = true;
}

module.exports = { pool, init };
