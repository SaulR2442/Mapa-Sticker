const jwt = require('jsonwebtoken');
const { JWT_SECRET, JWT_EXPIRES_IN } = require('../config/env');
const { users } = require('../db');

function sign(user) {
  return jwt.sign(
    { sub: user.id, username: user.username },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

// Middleware: exige token Bearer válido, deja req.userId y req.user
async function auth(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) {
      return res.status(401).json({ error: 'No autorizado: falta el token' });
    }
    const payload = jwt.verify(token, JWT_SECRET);
    const user = await users.findById(payload.sub);
    if (!user) return res.status(401).json({ error: 'Usuario no encontrado' });
    req.userId = user.id;
    req.user = user;
    next();
  } catch {
    return res.status(401).json({ error: 'Sesión inválida o expirada' });
  }
}

module.exports = { auth, sign };
