const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { UPLOAD_STICKERS_DIR, UPLOAD_AVATARS_DIR, MAX_FILE_SIZE } = require('../config/env');

const ALLOWED_EXT = /\.(jpe?g|png|gif|webp)$/i;

function storageFor(dir) {
  return multer.diskStorage({
    destination(req, file, cb) {
      fs.mkdirSync(dir, { recursive: true });
      cb(null, dir);
    },
    filename(req, file, cb) {
      const ext = (file.originalname.match(/\.(\w+)$/) || [, 'jpg'])[1].toLowerCase();
      cb(null, `${Date.now()}_${Math.round(Math.random() * 1e6)}.${ext}`);
    },
  });
}

function fileFilter(req, file, cb) {
  if (!ALLOWED_EXT.test(file.originalname)) {
    return cb(new Error('Solo se permiten imágenes (jpg, png, gif, webp)'));
  }
  cb(null, true);
}

// Formularios multipart de la app: sticker con imagen + campos, o perfil con avatar
const uploadSticker = multer({
  storage: storageFor(UPLOAD_STICKERS_DIR),
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE },
}).single('image');

const uploadAvatar = multer({
  storage: storageFor(UPLOAD_AVATARS_DIR),
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE },
}).single('avatar');

function wrap(middleware) {
  return (req, res, next) =>
    middleware(req, res, (err) => {
      if (err) return res.status(400).json({ error: err.message || 'Error al subir archivo' });
      next();
    });
}

// Convierte la URL pública del archivo subido
function fileUrl(req, dir) {
  const rel = path.relative(path.resolve(process.cwd(), 'public'), dir);
  return `/${rel.split(path.sep).join('/')}/${req.file.filename}`;
}

module.exports = { uploadSticker: wrap(uploadSticker), uploadAvatar: wrap(uploadAvatar), fileUrl };
