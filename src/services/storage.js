// Almacenamiento de imagenes: Supabase Storage (produccion) con fallback a
// disco local (desarrollo). Siempre devuelve una URL web publica.
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const {
  PUBLIC_DIR, SUPABASE_STORAGE, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_STORAGE_BUCKET,
} = require('../config/env');

const enabled = SUPABASE_STORAGE && Boolean(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY);
const bucket = SUPABASE_STORAGE_BUCKET || 'mapa-sticker';

let client = null;
if (enabled) {
  client = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function extension(filename) {
  const ext = (String(filename).match(/\.(\w+)$/) || [, 'jpg'])[1].toLowerCase();
  if (ext === 'jpeg') return 'jpg';
  if (ext === 'png' || ext === 'gif' || ext === 'webp') return ext;
  return 'jpg';
}

async function uploadImage(file, folder) {
  const filename = Date.now() + '_' + Math.round(Math.random() * 1e6) + '.' + extension(file.originalname);
  const contentType = file.mimetype || 'application/octet-stream';
  const objectPath = folder + '/' + filename;

  if (enabled) {
    const { data, error } = await client.storage.from(bucket).upload(objectPath, file.buffer, {
      contentType,
      upsert: false,
      cacheControl: '3600',
    });
    if (error) throw new Error('No se pudo subir la imagen a Supabase: ' + error.message);
    const { data: pub } = client.storage.from(bucket).getPublicUrl(data.path);
    return { url: pub.publicUrl };
  }

  const dirs = path.join(PUBLIC_DIR, 'uploads', folder);
  fs.mkdirSync(dirs, { recursive: true });
  fs.writeFileSync(path.join(dirs, filename), file.buffer);
  return { url: '/uploads/' + folder + '/' + filename };
}

async function deleteImage(urlOrObject) {
  if (!urlOrObject) return;
  const value = typeof urlOrObject === 'string' ? urlOrObject : (urlOrObject && urlOrObject.url) || urlOrObject;
  if (!value) return;

  if (enabled && value.includes('/object/public/')) {
    const marker = '/object/public/' + bucket + '/';
    const idx = value.indexOf(marker);
    if (idx !== -1) {
      const obj = decodeURIComponent(value.slice(idx + marker.length).split('?')[0]);
      await client.storage.from(bucket).remove([obj]);
    }
    return;
  }

  const rel = value.replace(/^\//, '');
  if (!rel.startsWith('uploads/')) return;
  try {
    const full = path.join(PUBLIC_DIR, rel);
    if (fs.existsSync(full)) fs.unlinkSync(full);
  } catch { /* archivo opcional */ }
}

module.exports = { uploadImage, deleteImage, storageEnabled: enabled, bucket };
