const { users, stickers, friends } = require('../db');
const { serialize } = require('./auth.controller');
const { uploadImage, deleteImage } = require('../services/storage');

async function updateMe(req, res) {
  const { displayName, bio, theme } = req.body || {};
  const patch = {};

  if (displayName !== undefined) {
    const name = String(displayName).trim();
    if (!name || name.length > 40) return res.status(400).json({ error: 'Nombre visible inválido (máx. 40 caracteres)' });
    patch.displayName = name;
  }
  if (bio !== undefined) {
    patch.bio = String(bio).slice(0, 300);
  }
  if (theme !== undefined) {
    if (!['light', 'dark'].includes(theme)) return res.status(400).json({ error: 'Tema inválido' });
    patch.theme = theme;
  }

  const previous = req.file ? await users.findById(req.userId) : null;
  if (req.file) {
    const uploaded = await uploadImage(req.file, 'avatars');
    patch.avatar = uploaded.url;
  }

  await users.updateProfile(req.userId, patch);

  // Limpia el avatar anterior cuando se reemplaza
  if (previous?.avatar && previous.avatar !== patch.avatar) {
    await deleteImage(previous.avatar).catch(() => {});
  }

  res.json({ user: serialize(await users.findById(req.userId)) });
}

async function friendStatus(myId, otherId) {
  const pair = await friends.getPair(myId, otherId);
  if (!pair) return 'none';
  if (pair.status === 'accepted') return 'accepted';
  return pair.requester_id === myId ? 'pending_out' : 'pending_in';
}

async function search(req, res) {
  const q = String(req.query.q || '').trim().slice(0, 40);
  if (!q) return res.json([]);
  const results = [];
  for (const u of await users.search(q, req.userId)) {
    const pair = await friends.getPair(req.userId, u.id);
    results.push({
      id: u.id,
      username: u.username,
      display_name: u.display_name,
      avatar: u.avatar,
      bio: u.bio,
      sticker_count: await stickers.countByUser(u.id),
      friend_status: pair
        ? (pair.status === 'accepted' ? 'accepted' : (pair.requester_id === req.userId ? 'pending_out' : 'pending_in'))
        : 'none',
      friend_id: pair ? pair.id : null,
    });
  }
  res.json(results);
}

async function getPublicProfile(req, res) {
  const user = await users.findPublicByUsername(String(req.params.username).toLowerCase());
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
  res.json({
    user,
    sticker_count: await stickers.countByUser(user.id),
    friend_count: await friends.countByUser(user.id),
    friend_status: req.userId ? await friendStatus(req.userId, user.id) : 'none',
  });
}

async function getStickers(req, res) {
  const user = await users.findPublicByUsername(String(req.params.username).toLowerCase());
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
  res.json(await stickers.listByUser(user.id, req.userId));
}

async function getRoute(req, res) {
  const user = await users.findPublicByUsername(String(req.params.username).toLowerCase());
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
  res.json(await stickers.routeByUser(user.id));
}

// Perfil + stickers + ruta en una sola llamada
async function getBundle(req, res) {
  const user = await users.findPublicByUsername(String(req.params.username).toLowerCase());
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
  const accepted = req.userId ? await friends.isAccepted(req.userId, user.id) : false;
  if (!accepted && user.id !== req.userId) {
    return res.status(403).json({ error: 'Debes ser amigo para ver este mapa' });
  }
  res.json({
    user,
    stickers: await stickers.listByUser(user.id, req.userId),
    route: await stickers.routeByUser(user.id),
    sticker_count: await stickers.countByUser(user.id),
    friend_count: await friends.countByUser(user.id),
  });
}

async function getMyBundle(req, res) {
  res.json({
    user: serialize(await users.findById(req.userId)),
    stickers: await stickers.listByUser(req.userId, req.userId),
    route: await stickers.routeByUser(req.userId),
    sticker_count: await stickers.countByUser(req.userId),
    friend_count: await friends.countByUser(req.userId),
  });
}

module.exports = {
  updateMe,
  search,
  getPublicProfile,
  getStickers,
  getRoute,
  getBundle,
  getMyBundle,
};
