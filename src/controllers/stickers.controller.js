const { stickers, likes } = require('../db');
const { extractGps } = require('../utils/exif');
const { uploadImage, deleteImage } = require('../services/storage');
const {
  CATEGORY_IDS, categoryMeta, parseTags, isFiniteNumber, toNumber, NO_CATEGORY,
} = require('../utils/validation');

async function create(req, res) {
  if (!req.file || !req.file.size) {
    return res.status(400).json({ error: 'La imagen del sticker es obligatoria' });
  }
  const body = req.body || {};

  const title = String(body.title || '').trim().slice(0, 80);
  if (!title) return res.status(400).json({ error: 'El título es obligatorio' });

  const rawCategory = String(body.category || '').trim();
  if (rawCategory && !CATEGORY_IDS.includes(rawCategory)) {
    return res.status(400).json({ error: 'Categoría inválida' });
  }
  const category = rawCategory || NO_CATEGORY;

  const tags = parseTags(body.tags);

  // Ubicación: primero manual parse, luego EXIF de la imagen
  let lat = toNumber(body.lat);
  let lng = toNumber(body.lng);
  if (!isFiniteNumber(lat) || !isFiniteNumber(lng)) {
    const gps = await extractGps(req.file.buffer);
    if (gps) { lat = gps.lat; lng = gps.lng; }
  }
  if (!isFiniteNumber(lat) || !isFiniteNumber(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return res.status(400).json({
      error: 'No se encontró GPS en la imagen. Marca la ubicación manualmente en el mapa.',
    });
  }

  const takenAt = body.taken_at ? String(body.taken_at).slice(0, 10) : null;
  const description = String(body.description || '').slice(0, 1000);

  // Guarda la imagen (Supabase Storage o disco local) y obtén su URL web pública
  let uploaded;
  let sticker;
  try {
    uploaded = await uploadImage(req.file, 'stickers');
    sticker = await stickers.create({
      userId: req.userId,
      title,
      description,
      imageUrl: uploaded.url,
      category,
      tags,
      lat,
      lng,
      takenAt,
    });
  } catch (err) {
    console.error('[POST /api/stickers] Error al crear el sticker:', err);
    if (err.code) {
      console.error('[POST /api/stickers] Detalle pg:', {
        code: err.code,
        detail: err.detail,
        hint: err.hint,
        constraint: err.constraint,
        table: err.table,
      });
    }
    if (uploaded) await deleteImage(uploaded.url).catch(() => {});
    const isDev = process.env.NODE_ENV !== 'production';
    return res.status(500).json({
      error: isDev ? err.message : 'Error interno del servidor',
      ...(isDev ? { details: err.stack } : {}),
    });
  }

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
  await deleteImage(sticker.image_url).catch(() => {});
  res.json({ ok: true });
}

// Vista global: todos los stickers públicos de la plataforma
// (se excluyen los perfiles privados; el usuario siempre ve los suyos)
async function getGlobal(req, res) {
  const stickersList = await stickers.listPublic(req.userId);
  res.json({ stickers: stickersList });
}

module.exports = { create, listMine, getOne, remove, getGlobal, toggleLike };
