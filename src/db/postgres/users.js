// Repositorio PostgreSQL: misma interfaz async que src/db/repositories/*
const { pool } = require('./database');

const PUBLIC_COLUMNS = `
  id, username, display_name, avatar, bio, theme, created_at
`;

const users = {
  async create({ email, username, passwordHash, displayName }) {
    const { rows } = await pool.query(
      `INSERT INTO users (email, username, password_hash, display_name)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [email, username, passwordHash, displayName]
    );
    return { id: rows[0].id };
  },

  async findById(id) {
    const { rows } = await pool.query(
      `SELECT ${PUBLIC_COLUMNS}, email FROM users WHERE id = $1`,
      [id]
    );
    return rows[0] || null;
  },

  async findByEmail(email) {
    const { rows } = await pool.query(
      `SELECT * FROM users WHERE email = $1`,
      [email]
    );
    return rows[0] || null;
  },

  async findByUsername(username) {
    const { rows } = await pool.query(
      `SELECT * FROM users WHERE LOWER(username) = LOWER($1)`,
      [username]
    );
    return rows[0] || null;
  },

  async findPublicByUsername(username) {
    const { rows } = await pool.query(
      `SELECT ${PUBLIC_COLUMNS} FROM users WHERE LOWER(username) = LOWER($1)`,
      [username]
    );
    return rows[0] || null;
  },

  // Todos los usuarios (solo para migración de avatares a Supabase Storage)
  async listAll() {
    const { rows } = await pool.query(
      `SELECT id, avatar FROM users`
    );
    return rows;
  },

  async updateProfile(id, { displayName, bio, avatar, theme }) {
    const sets = [];
    const values = [];
    let i = 1;
    if (displayName !== undefined) { sets.push(`display_name = $${i++}`); values.push(displayName); }
    if (bio !== undefined) { sets.push(`bio = $${i++}`); values.push(bio); }
    if (avatar !== undefined) { sets.push(`avatar = $${i++}`); values.push(avatar); }
    if (theme !== undefined) { sets.push(`theme = $${i++}`); values.push(theme); }
    if (!sets.length) return { changes: 0 };
    values.push(id);
    const { rowCount } = await pool.query(
      `UPDATE users SET ${sets.join(', ')} WHERE id = $${i}`,
      values
    );
    return { changes: rowCount };
  },

  async search(query, exceptId) {
    const like = `%${query}%`;
    const { rows } = await pool.query(
      `SELECT ${PUBLIC_COLUMNS} FROM users
       WHERE (username ILIKE $1 OR display_name ILIKE $1) AND id != $2
       ORDER BY username LIMIT 20`,
      [like, exceptId]
    );
    return rows;
  },
};

module.exports = users;
