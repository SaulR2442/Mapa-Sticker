// Conexion PostgreSQL/Supabase y esquema con creacion automatica de tablas.
const { Pool } = require('pg');
const { DATABASE_URL, DB_SSL } = require('../../config/env');

const pool = new Pool({
  connectionString: DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30000,
  ...(DB_SSL ? { ssl: { rejectUnauthorized: false } } : {}),
});

// Tablas e indices (idempotente): se crean si no existen al arrancar.
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

// Reparaciones idempotentes para esquemas creados a mano (p. ej. desde el
// dashboard de Supabase): columnas que pudieron faltar y, sobre todo, RLS.
// Supabase activa Row Level Security por defecto en tablas creadas por UI,
// lo que hace fallar los INSERT del backend con error 500.
const HEAL = `
ALTER TABLE users       ADD COLUMN IF NOT EXISTS avatar TEXT;
ALTER TABLE users       ADD COLUMN IF NOT EXISTS bio TEXT NOT NULL DEFAULT '';
ALTER TABLE users       ADD COLUMN IF NOT EXISTS theme TEXT NOT NULL DEFAULT 'light';
ALTER TABLE stickers    ADD COLUMN IF NOT EXISTS description TEXT NOT NULL DEFAULT '';
ALTER TABLE stickers    ADD COLUMN IF NOT EXISTS image_url TEXT NOT NULL DEFAULT '';
ALTER TABLE stickers    ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'sin-categoria';
ALTER TABLE stickers    ADD COLUMN IF NOT EXISTS tags TEXT NOT NULL DEFAULT '[]';
ALTER TABLE stickers    ADD COLUMN IF NOT EXISTS lat DOUBLE PRECISION;
ALTER TABLE stickers    ADD COLUMN IF NOT EXISTS lng DOUBLE PRECISION;
ALTER TABLE stickers    ADD COLUMN IF NOT EXISTS taken_at TEXT;
ALTER TABLE friendships ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE users       DISABLE ROW LEVEL SECURITY;
ALTER TABLE stickers    DISABLE ROW LEVEL SECURITY;
ALTER TABLE friendships DISABLE ROW LEVEL SECURITY;
ALTER TABLE likes       DISABLE ROW LEVEL SECURITY;
`;

let initialized = false;

async function init() {
  if (initialized) return;
  // Crear tablas/indices: si esto falla, el arranque falla con log claro.
  await pool.query(SCHEMA);
  try {
    await pool.query(HEAL);
    console.log('[db] Esquema PostgreSQL verificado (tablas listas).');
  } catch (err) {
    // Las reparaciones son best-effort: no bloquean el arranque.
    console.warn('[db] No se pudieron aplicar reparaciones de esquema:', err.message);
  }
  initialized = true;
}

module.exports = { pool, init };
