// Repositorio PostgreSQL: misma interfaz async que src/db/repositories/*
const { pool } = require('./database');

const FRIEND_COLUMNS = `
  f.id, f.requester_id, f.addressee_id, f.status, f.created_at,
  u.username, u.display_name, u.avatar
`;

const friends = {
  // Devuelve: { status: 'pending'|'accepted', direction: 'outgoing'|'incoming', id }
  async getPair(userA, userB) {
    const { rows } = await pool.query(
      `SELECT * FROM friendships
       WHERE (requester_id = $1 AND addressee_id = $2)
          OR (requester_id = $2 AND addressee_id = $1)
       LIMIT 1`,
      [userA, userB]
    );
    return rows[0] || null;
  },

  async request(requesterId, addresseeId) {
    const { rows } = await pool.query(
      `INSERT INTO friendships (requester_id, addressee_id, status)
       VALUES ($1, $2, 'pending') RETURNING id`,
      [requesterId, addresseeId]
    );
    return rows[0].id;
  },

  async findById(id) {
    const { rows } = await pool.query(
      `SELECT * FROM friendships WHERE id = $1`,
      [id]
    );
    return rows[0] || null;
  },

  async setStatus(id, status) {
    const { rowCount } = await pool.query(
      `UPDATE friendships SET status = $1 WHERE id = $2`,
      [status, id]
    );
    return { changes: rowCount };
  },

  async remove(id) {
    const { rowCount } = await pool.query(
      `DELETE FROM friendships WHERE id = $1`,
      [id]
    );
    return rowCount;
  },

  // Lista de amistades aceptadas de un usuario, con los datos del amigo
  async listAccepted(userId) {
    const { rows } = await pool.query(
      `SELECT ${FRIEND_COLUMNS} FROM friendships f
       JOIN users u ON u.id = CASE WHEN f.requester_id = $1 THEN f.addressee_id ELSE f.requester_id END
       WHERE f.status = 'accepted' AND (f.requester_id = $1 OR f.addressee_id = $1)
       ORDER BY u.display_name`,
      [userId]
    );
    return rows;
  },

  // Solicitudes entrantes (pendientes) hacia el usuario
  async listIncoming(userId) {
    const { rows } = await pool.query(
      `SELECT ${FRIEND_COLUMNS} FROM friendships f
       JOIN users u ON u.id = f.requester_id
       WHERE f.addressee_id = $1 AND f.status = 'pending'
       ORDER BY f.created_at DESC`,
      [userId]
    );
    return rows;
  },

  // Solicitudes salientes (pendientes) del usuario
  async listOutgoing(userId) {
    const { rows } = await pool.query(
      `SELECT ${FRIEND_COLUMNS} FROM friendships f
       JOIN users u ON u.id = f.addressee_id
       WHERE f.requester_id = $1 AND f.status = 'pending'
       ORDER BY f.created_at DESC`,
      [userId]
    );
    return rows;
  },

  // Usernames de los amigos aceptados (para consultas globales)
  async acceptedUsernames(userId) {
    const list = await friends.listAccepted(userId);
    return list.map((f) => f.username);
  },

  async isAccepted(userA, userB) {
    const { rows } = await pool.query(
      `SELECT id FROM friendships
       WHERE status = 'accepted'
         AND ((requester_id = $1 AND addressee_id = $2)
           OR (requester_id = $2 AND addressee_id = $1))
       LIMIT 1`,
      [userA, userB]
    );
    return rows.length > 0;
  },

  async countByUser(userId) {
    const { rows } = await pool.query(
      `SELECT COUNT(*)::int AS n FROM friendships
       WHERE status = 'accepted' AND (requester_id = $1 OR addressee_id = $1)`,
      [userId]
    );
    return rows[0].n;
  },
};

module.exports = friends;
