// Repositorio SQLite (async: interfaz común con el driver PostgreSQL)
const db = require('../database');

// viewerId: usuario actual para calcular `liked_by_me` (null si no hay sesión)
const STICKER_COLUMNS = `
  s.id, s.user_id, s.title, s.description, s.image_url, s.category,
  s.tags, s.lat, s.lng, s.taken_at, s.created_at,
  u.username, u.display_name, u.avatar AS user_avatar,
  (SELECT COUNT(*) FROM likes l WHERE l.sticker_id = s.id) AS likes_count,
  EXISTS(SELECT 1 FROM likes l WHERE l.sticker_id = s.id AND l.user_id = ?) AS liked_by_me
`;

function normalize(row) {
  if (!row) return null;
  return { ...row, liked_by_me: !!row.liked_by_me };
}

const stickers = {
  async create({ userId, title, description, imageUrl, category, tags, lat, lng, takenAt }) {
    const info = db.prepare(
      `INSERT INTO stickers (user_id, title, description, image_url, category, tags, lat, lng, taken_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(userId, title, description, imageUrl, category, JSON.stringify(tags), lat, lng, takenAt || null);
    return stickers.findById(info.lastInsertRowid, userId);
  },

  async findById(id, viewerId = null) {
    return normalize(db.prepare(
      `SELECT ${STICKER_COLUMNS} FROM stickers s
       JOIN users u ON u.id = s.user_id
       WHERE s.id = ?`
    ).get(viewerId, id));
  },

  async listByUser(userId, viewerId = null) {
    return db.prepare(
      `SELECT ${STICKER_COLUMNS} FROM stickers s
       JOIN users u ON u.id = s.user_id
       WHERE s.user_id = ?
       ORDER BY datetime(s.taken_at) IS NULL, datetime(s.taken_at) DESC, datetime(s.created_at) DESC`
    ).all(viewerId, userId).map(normalize);
  },

  async listByUsernames(usernames, viewerId = null) {
    if (!usernames.length) return [];
    const placeholders = usernames.map(() => '?').join(', ');
    return db.prepare(
      `SELECT ${STICKER_COLUMNS} FROM stickers s
       JOIN users u ON u.id = s.user_id
       WHERE u.username IN (${placeholders})
       ORDER BY datetime(s.created_at) DESC`
    ).all(viewerId, ...usernames).map(normalize);
  },

  // Puntos cronológicos (ordenados por fecha) para trazar la ruta del usuario
  async routeByUser(userId) {
    return db.prepare(
      `SELECT lat, lng, taken_at, created_at FROM stickers
       WHERE user_id = ?
       ORDER BY datetime(taken_at) IS NULL, datetime(taken_at), datetime(created_at)`
    ).all(userId).map((s) => ({
      lat: s.lat,
      lng: s.lng,
      taken_at: s.taken_at,
    }));
  },

  // Fechas (YYYY-MM-DD, UTC) de los stickers de un usuario, para rachas y stats
  async stickerDates(userId) {
    return db.prepare(
      `SELECT COALESCE(date(taken_at), date(created_at)) AS d
       FROM stickers WHERE user_id = ?`
    ).all(userId).map((r) => r.d);
  },

  async countByUser(userId) {
    return db.prepare(
      `SELECT COUNT(*) AS n FROM stickers WHERE user_id = ?`
    ).get(userId).n;
  },

  async remove(id, userId) {
    return db.prepare(
      `DELETE FROM stickers WHERE id = ? AND user_id = ?`
    ).run(id, userId).changes;
  },
};

module.exports = stickers;
