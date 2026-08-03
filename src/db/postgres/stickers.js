// Repositorio PostgreSQL: misma interfaz async que src/db/repositories/*
const { pool } = require('./database');

// viewerId: usuario actual para calcular `liked_by_me` (null si no hay sesión)
const STICKER_COLUMNS = `
  s.id, s.user_id, s.title, s.description, s.image_url, s.category,
  s.tags, s.lat, s.lng, s.taken_at, s.created_at,
  u.username, u.display_name, u.avatar AS user_avatar,
  (SELECT COUNT(*)::int FROM likes l WHERE l.sticker_id = s.id) AS likes_count,
  EXISTS(SELECT 1 FROM likes l WHERE l.sticker_id = s.id AND l.user_id = $1) AS liked_by_me
`;

// tags se guarda como texto JSON: el cliente espera un array
function parseTags(raw) {
  try { return JSON.parse(raw || '[]'); } catch { return []; }
}
function normalize(row) {
  if (!row) return null;
  return { ...row, liked_by_me: !!row.liked_by_me, tags: parseTags(row.tags) };
}

const stickers = {
  async create({ userId, title, description, imageUrl, category, tags, lat, lng, takenAt }) {
    const { rows } = await pool.query(
      `INSERT INTO stickers (user_id, title, description, image_url, category, tags, lat, lng, taken_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
      [userId, title, description, imageUrl, category, JSON.stringify(tags), lat, lng, takenAt || null]
    );
    return stickers.findById(rows[0].id, userId);
  },

  async findById(id, viewerId = null) {
    const { rows } = await pool.query(
      `SELECT ${STICKER_COLUMNS} FROM stickers s
       JOIN users u ON u.id = s.user_id
       WHERE s.id = $2`,
      [viewerId, id]
    );
    return normalize(rows[0]);
  },

  async listByUser(userId, viewerId = null) {
    const { rows } = await pool.query(
      `SELECT ${STICKER_COLUMNS} FROM stickers s
       JOIN users u ON u.id = s.user_id
       WHERE s.user_id = $2
       ORDER BY s.taken_at IS NULL, s.taken_at DESC, s.created_at DESC`,
      [viewerId, userId]
    );
    return rows.map(normalize);
  },

  async listByUsernames(usernames, viewerId = null) {
    if (!usernames.length) return [];
    const placeholders = usernames.map((_, i) => `$${i + 2}`).join(', ');
    const { rows } = await pool.query(
      `SELECT ${STICKER_COLUMNS} FROM stickers s
       JOIN users u ON u.id = s.user_id
       WHERE u.username IN (${placeholders})
       ORDER BY s.created_at DESC`,
      [viewerId, ...usernames]
    );
    return rows.map(normalize);
  },

  // Puntos cronológicos (ordenados por fecha) para trazar la ruta del usuario
  async routeByUser(userId) {
    const { rows } = await pool.query(
      `SELECT lat, lng, taken_at, created_at FROM stickers
       WHERE user_id = $1
       ORDER BY taken_at IS NULL, taken_at, created_at`,
      [userId]
    );
    return rows.map((s) => ({ lat: s.lat, lng: s.lng, taken_at: s.taken_at }));
  },

  // Fechas (YYYY-MM-DD, UTC) de los stickers de un usuario, para rachas y stats
  // taken_at ya se guarda como texto YYYY-MM-DD; created_at se pasa a UTC.
  async stickerDates(userId) {
    const { rows } = await pool.query(
      `SELECT COALESCE(taken_at, (created_at AT TIME ZONE 'UTC')::date::text) AS d
       FROM stickers WHERE user_id = $1`,
      [userId]
    );
    return rows.map((r) => r.d);
  },

  async countByUser(userId) {
    const { rows } = await pool.query(
      `SELECT COUNT(*)::int AS n FROM stickers WHERE user_id = $1`,
      [userId]
    );
    return rows[0].n;
  },

  // ID y URL de todos los stickers (migración de imágenes a Supabase Storage)
  async listAll() {
    const { rows } = await pool.query(
      `SELECT id, image_url FROM stickers`
    );
    return rows;
  },

  async updateImageUrl(id, imageUrl) {
    const { rowCount } = await pool.query(
      `UPDATE stickers SET image_url = $1 WHERE id = $2`,
      [imageUrl, id]
    );
    return { changes: rowCount };
  },

  async remove(id, userId) {
    const { rowCount } = await pool.query(
      `DELETE FROM stickers WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );
    return rowCount;
  },
};

module.exports = stickers;
