// Repositorio SQLite (async: interfaz común con el driver PostgreSQL)
const db = require('../database');

const PUBLIC_COLUMNS = `
  id, username, display_name, avatar, bio, theme, created_at
`;

const users = {
  async create({ email, username, passwordHash, displayName }) {
    const info = db.prepare(
      `INSERT INTO users (email, username, password_hash, display_name)
       VALUES (?, ?, ?, ?)`
    ).run(email, username, passwordHash, displayName);
    return { id: info.lastInsertRowid };
  },

  async findById(id) {
    return db.prepare(
      `SELECT ${PUBLIC_COLUMNS}, email FROM users WHERE id = ?`
    ).get(id);
  },

  async findByEmail(email) {
    return db.prepare(
      `SELECT * FROM users WHERE email = ?`
    ).get(email);
  },

  async findByUsername(username) {
    return db.prepare(
      `SELECT * FROM users WHERE username = ? COLLATE NOCASE`
    ).get(username);
  },

  async findPublicByUsername(username) {
    return db.prepare(
      `SELECT ${PUBLIC_COLUMNS} FROM users WHERE username = ? COLLATE NOCASE`
    ).get(username);
  },

  // Todos los usuarios (solo para migración de avatares a Supabase Storage)
  async listAll() {
    return db.prepare(
      `SELECT id, avatar FROM users`
    ).all();
  },

  async updateProfile(id, { displayName, bio, avatar, theme }) {
    const sets = [];
    const values = [];
    if (displayName !== undefined) { sets.push('display_name = ?'); values.push(displayName); }
    if (bio !== undefined) { sets.push('bio = ?'); values.push(bio); }
    if (avatar !== undefined) { sets.push('avatar = ?'); values.push(avatar); }
    if (theme !== undefined) { sets.push('theme = ?'); values.push(theme); }
    if (!sets.length) return { changes: 0 };
    values.push(id);
    return db.prepare(
      `UPDATE users SET ${sets.join(', ')} WHERE id = ?`
    ).run(...values);
  },

  async search(query, exceptId) {
    const like = `%${query}%`;
    return db.prepare(
      `SELECT ${PUBLIC_COLUMNS} FROM users
       WHERE (username LIKE ? OR display_name LIKE ?) AND id != ?
       ORDER BY username LIMIT 20`
    ).all(like, like, exceptId);
  },
};

module.exports = users;
