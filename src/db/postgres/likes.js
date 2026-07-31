// Repositorio PostgreSQL: misma interfaz async que src/db/repositories/*
const { pool } = require('./database');

const likes = {
  async exists(stickerId, userId) {
    const { rows } = await pool.query(
      `SELECT id FROM likes WHERE sticker_id = $1 AND user_id = $2`,
      [stickerId, userId]
    );
    return rows.length > 0;
  },

  async add(stickerId, userId) {
    const { rowCount } = await pool.query(
      `INSERT INTO likes (sticker_id, user_id) VALUES ($1, $2)
       ON CONFLICT (sticker_id, user_id) DO NOTHING`,
      [stickerId, userId]
    );
    return rowCount;
  },

  async remove(stickerId, userId) {
    const { rowCount } = await pool.query(
      `DELETE FROM likes WHERE sticker_id = $1 AND user_id = $2`,
      [stickerId, userId]
    );
    return rowCount;
  },

  async countBySticker(stickerId) {
    const { rows } = await pool.query(
      `SELECT COUNT(*)::int AS n FROM likes WHERE sticker_id = $1`,
      [stickerId]
    );
    return rows[0].n;
  },
};

module.exports = likes;
