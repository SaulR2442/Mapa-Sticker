// Repositorio SQLite (async: interfaz común con el driver PostgreSQL)
const db = require('../database');

const likes = {
  async exists(stickerId, userId) {
    return !!db.prepare(
      'SELECT id FROM likes WHERE sticker_id = ? AND user_id = ?'
    ).get(stickerId, userId);
  },

  async add(stickerId, userId) {
    return db.prepare(
      'INSERT OR IGNORE INTO likes (sticker_id, user_id) VALUES (?, ?)'
    ).run(stickerId, userId).changes;
  },

  async remove(stickerId, userId) {
    return db.prepare(
      'DELETE FROM likes WHERE sticker_id = ? AND user_id = ?'
    ).run(stickerId, userId).changes;
  },

  async countBySticker(stickerId) {
    return db.prepare(
      'SELECT COUNT(*) AS n FROM likes WHERE sticker_id = ?'
    ).get(stickerId).n;
  },
};

module.exports = likes;
