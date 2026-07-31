// Repositorio SQLite (async: interfaz común con el driver PostgreSQL)
const db = require('../database');

const FRIEND_COLUMNS = `
  f.id, f.requester_id, f.addressee_id, f.status, f.created_at,
  u.username, u.display_name, u.avatar
`;

const friends = {
  // Devuelve: { status: 'pending'|'accepted', direction: 'outgoing'|'incoming', id }
  async getPair(userA, userB) {
    return db.prepare(
      `SELECT * FROM friendships
       WHERE (requester_id = ? AND addressee_id = ?)
          OR (requester_id = ? AND addressee_id = ?)
       LIMIT 1`
    ).get(userA, userB, userB, userA);
  },

  async request(requesterId, addresseeId) {
    const info = db.prepare(
      `INSERT INTO friendships (requester_id, addressee_id, status)
       VALUES (?, ?, 'pending')`
    ).run(requesterId, addresseeId);
    return info.lastInsertRowid;
  },

  async findById(id) {
    return db.prepare(
      `SELECT * FROM friendships WHERE id = ?`
    ).get(id);
  },

  async setStatus(id, status) {
    return db.prepare(
      `UPDATE friendships SET status = ? WHERE id = ?`
    ).run(status, id);
  },

  async remove(id) {
    return db.prepare(`DELETE FROM friendships WHERE id = ?`).run(id).changes;
  },

  // Lista de amistades aceptadas de un usuario, con los datos del amigo
  async listAccepted(userId) {
    return db.prepare(
      `SELECT ${FRIEND_COLUMNS} FROM friendships f
       JOIN users u ON u.id = CASE WHEN f.requester_id = ? THEN f.addressee_id ELSE f.requester_id END
       WHERE f.status = 'accepted' AND (f.requester_id = ? OR f.addressee_id = ?)
       ORDER BY u.display_name`
    ).all(userId, userId, userId);
  },

  // Solicitudes entrantes (pendientes) hacia el usuario
  async listIncoming(userId) {
    return db.prepare(
      `SELECT ${FRIEND_COLUMNS} FROM friendships f
       JOIN users u ON u.id = f.requester_id
       WHERE f.addressee_id = ? AND f.status = 'pending'
       ORDER BY f.created_at DESC`
    ).all(userId);
  },

  // Solicitudes salientes (pendientes) del usuario
  async listOutgoing(userId) {
    return db.prepare(
      `SELECT ${FRIEND_COLUMNS} FROM friendships f
       JOIN users u ON u.id = f.addressee_id
       WHERE f.requester_id = ? AND f.status = 'pending'
       ORDER BY f.created_at DESC`
    ).all(userId);
  },

  // Usernames de los amigos aceptados (para consultas globales)
  async acceptedUsernames(userId) {
    const list = await friends.listAccepted(userId);
    return list.map((f) => f.username);
  },

  async isAccepted(userA, userB) {
    return !!db.prepare(
      `SELECT id FROM friendships
       WHERE status = 'accepted'
         AND ((requester_id = ? AND addressee_id = ?)
           OR (requester_id = ? AND addressee_id = ?))`
    ).get(userA, userB, userB, userA);
  },

  async countByUser(userId) {
    return db.prepare(
      `SELECT COUNT(*) AS n FROM friendships
       WHERE status = 'accepted' AND (requester_id = ? OR addressee_id = ?)`
    ).get(userId, userId).n;
  },
};

module.exports = friends;
