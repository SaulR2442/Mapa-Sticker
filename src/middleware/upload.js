const multer = require('multer');
const { MAX_FILE_SIZE } = require('../config/env');

const ALLOWED_EXT = /\.(jpe?g|png|gif|webp)$/i;

// Memoria en vez de disco: el archivo se guarda en Supabase Storage o disco
// local en el controlador (servicio storage), con la extensión ya validada.
const memoryStorage = multer.memoryStorage();

function fileFilter(req, file, cb) {
  if (!file || !ALLOWED_EXT.test(file.originalname)) {
    return cb(new Error('Solo se permiten imágenes (jpg, png, gif, webp)'));
  }
  if (!/^image\//.test(file.mimetype || '')) {
    return cb(new Error('El archivo debe ser una imagen (jpg, png, gif, webp)'));
  }
  cb(null, true);
}

const base = multer({ storage: memoryStorage, fileFilter, limits: { fileSize: MAX_FILE_SIZE } });

// Formularios multipart de la app: sticker con imagen + campos, o perfil con avatar
const uploadSticker = base.single('image');
const uploadAvatar = base.single('avatar');

function wrap(middleware) {
  return (req, res, next) =>
    middleware(req, res, (err) => {
      if (err) return res.status(400).json({ error: err.message || 'Error al subir archivo' });
      next();
    });
}

module.exports = { uploadSticker: wrap(uploadSticker), uploadAvatar: wrap(uploadAvatar) };
