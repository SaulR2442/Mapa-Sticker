const path = require('path');
const fs = require('fs');
const { stickers, friends, likes } = require('../db');
const { extractGps } = require('../utils/exif');
const { fileUrl } = require('../middleware/upload');
const {
  CATEGORY_IDS, categoryMeta, parseTags, isFiniteNumber, toNumber, NO_CATEGORY,
} = require('../utils/validation');
const { UPLOAD_STICKERS_DIR } = require('../config/env');

async function create(req, res) {
  if (!req.file) return res.status(400).json({ error: 'La imagen del sticker es obligatoria' });
  const body = req.body || {};
  const imageUrl = fileUrl(req, UPLOAD_STICKERS_DIR);

  const title = String(body.title || '').trim().slice(0, 80);
  if (!title) {
    fs.unlinkSync(req.file.path);
    return res.status(400).json({ error: 'El título es obligatorio' });
  }
  const rawCategory = String(body.category || '').trim();
  if (rawCategory && !CATEGORY_IDS.includes(rawCategory)) {
    fs.unlinkSync(req.file.path);
    return res.status(400).json({ error: 'Categoría inválida' });
  }
  const category = rawCategory || NO_CATEGORY;

  const tags = parseTags(body.tags);

  // Ubicación: manual > EXIF de la imagen
  let lat = toNumber(body.lat);
  let lng = toNumber(body.lng);
  if (!isFiniteNumber(lat) || !isFiniteNumber(lng)) {
    const gps = await extractGps(req.file.path);
    if (gps) { lat = gps.lat; lng = gps.lng; }
  }
  if (!isFiniteNumber(lat) || !isFiniteNumber(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    fs.unlinkSync(req.file.path);
    return res.status(400).json({
      error: 'No se encontró GPS en la imagen. Marca la ubicación manualmente en el mapa.',
    });
  }

  const takenAt = body.taken_at ? String(body.taken_at).slice(0, 10) : null;
  const description = String(body.description || '').slice(0, 1000);

  const sticker = await stickers.create({
    userId: req.userId,
    title,
    description,
    imageUrl,
    category,
    tags,
    lat,
    lng,
    takenAt,
  });

  res.status(201).json({ sticker: { ...sticker, category_meta: categoryMeta(category) } });
}

async function listMine(req, res) {
  res.json(await stickers.listByUser(req.userId, req.userId));
}

async function getOne(req, res) {
  const sticker = await stickers.findById(Number(req.params.id), req.userId);
  if (!sticker) return res.status(404).json({ error: 'Sticker no encontrado' });
  res.json({ sticker });
}

// Da o quita un like (toggle) y devuelve el nuevo estado
async function toggleLike(req, res) {
  const id = Number(req.params.id);
  const sticker = await stickers.findById(id);
  if (!sticker) return res.status(404).json({ error: 'Sticker no encontrado' });
  const liked = await likes.exists(id, req.userId);
  if (liked) await likes.remove(id, req.userId);
  else await likes.add(id, req.userId);
  res.json({ liked: !liked, likes_count: await likes.countBySticker(id) });
}

async function remove(req, res) {
  const id = Number(req.params.id);
  const sticker = await stickers.findById(id);
  if (!sticker) return res.status(404).json({ error: 'Sticker no encontrado' });
  if (sticker.user_id !== req.userId) {
    return res.status(403).json({ error: 'No puedes eliminar stickers de otros usuarios' });
  }
  await stickers.remove(id, req.userId);
  try {
    const full = path.resolve(process.cwd(), 'public', sticker.image_url.replace(/^\//, ''));
    if (fs.existsSync(full)) fs.unlinkSync(full);
  } catch { /* archivo opcional */ }
  res.json({ ok: true });
}

// Vista global: mis stickers + los de mis amigos aceptados
async function getGlobal(req, res) {
  const usernames = [req.user.username, ...(await friends.acceptedUsernames(req.userId))];
  res.json(await stickers.listByUsernames(usernames, req.userId));
}

module.exports = { create, listMine, getOne, remove, getGlobal, toggleLike };
