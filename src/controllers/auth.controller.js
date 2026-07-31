const bcrypt = require('bcryptjs');
const { users } = require('../db');
const { sign } = require('../middleware/auth');
const {
  isValidEmail, isValidUsername, isValidPassword,
} = require('../utils/validation');

function serialize(user) {
  if (!user) return null;
  const { password_hash, ...safe } = user;
  return safe;
}

async function register(req, res) {
  const { email, username, password } = req.body || {};

  if (!isValidEmail(email)) return res.status(400).json({ error: 'Correo inválido' });
  if (!isValidUsername(username)) {
    return res.status(400).json({ error: 'El usuario debe tener 3-20 caracteres (letras, números o _)' });
  }
  if (!isValidPassword(password)) {
    return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
  }
  if (await users.findByEmail(email)) return res.status(409).json({ error: 'Ese correo ya está registrado' });
  if (await users.findByUsername(username)) return res.status(409).json({ error: 'Ese nombre de usuario ya existe' });

  const usernameClean = username.toLowerCase();
  const passwordHash = await bcrypt.hash(password, 10);
  const { id } = await users.create({
    email: email.toLowerCase(),
    username: usernameClean,
    passwordHash,
    displayName: usernameClean,
  });

  const user = await users.findById(id);
  res.status(201).json({ token: sign(user), user: serialize(user) });
}

async function login(req, res) {
  const { identifier, password } = req.body || {};
  if (!identifier || !password) return res.status(400).json({ error: 'Faltan datos' });

  const user = identifier.includes('@')
    ? await users.findByEmail(identifier.toLowerCase())
    : await users.findByUsername(identifier.toLowerCase());

  if (!user) return res.status(401).json({ error: 'Credenciales inválidas' });
  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) return res.status(401).json({ error: 'Credenciales inválidas' });

  res.json({ token: sign(user), user: serialize(user) });
}

async function me(req, res) {
  res.json({ user: serialize(await users.findById(req.userId)) });
}

module.exports = { register, login, me, serialize };
