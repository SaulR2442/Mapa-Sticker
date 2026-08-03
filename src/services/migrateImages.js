// Migra imagenes guardadas en rutas locales (/uploads/...) a Supabase Storage.
// Best-effort: si el archivo local ya no existe (disco efimero de Render)
// se omite; nunca rompe el arranque.
const fs = require('fs');
const path = require('path');
const { stickers, users } = require('../db');
const { uploadImage, storageEnabled } = require('./storage');
const { PUBLIC_DIR } = require('../config/env');

function isLocalPath(url) {
  return typeof url === 'string' && !/^https?:\/\//.test(url) && url.indexOf('uploads/') !== -1;
}

function mimeFor(filename) {
  const ext = String(filename).match(/\.(\w+)$/);
  const map = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif', webp: 'image/webp' };
  return map[ext ? ext[1].toLowerCase() : ''] || 'image/jpeg';
}

async function reuploadLocal(url, folder) {
  if (!isLocalPath(url)) return null;
  const rel = url.replace(/^\//, '');
  const full = path.join(PUBLIC_DIR, rel);
  let buffer;
  try {
    buffer = fs.readFileSync(full);
  } catch {
    return null; // el archivo ya no existe en disco
  }
  const filename = path.basename(full);
  try {
    const uploaded = await uploadImage({ originalname: filename, buffer, mimetype: mimeFor(filename) }, folder);
    return uploaded.url;
  } catch (err) {
    console.warn('[storage] No se pudo migrar', rel, err.message);
    return null;
  }
}

async function migrateLocalImagesToSupabase() {
  if (!storageEnabled) return;
  let moved = 0;

  for (const row of await stickers.listAll()) {
    if (!isLocalPath(row.image_url)) continue;
    const url = await reuploadLocal(row.image_url, 'stickers');
    if (!url) continue;
    await stickers.updateImageUrl(row.id, url);
    moved += 1;
  }

  for (const row of await users.listAll()) {
    if (!isLocalPath(row.avatar)) continue;
    const url = await reuploadLocal(row.avatar, 'avatars');
    if (!url) continue;
    await users.updateProfile(row.id, { avatar: url });
    moved += 1;
  }

  console.log('[storage] Migracion de imagenes locales: ' + moved + ' subida(s) a Supabase.');
}

module.exports = { migrateLocalImagesToSupabase };
