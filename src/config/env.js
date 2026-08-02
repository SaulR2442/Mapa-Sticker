const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT, 10) || 3000,
  JWT_SECRET: process.env.JWT_SECRET || 'clave-insegura-cambiar',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  // 'sqlite' o 'postgres' (futuro: Supabase)
  DB_DRIVER: process.env.DB_DRIVER || 'sqlite',
  DATABASE_URL: process.env.DATABASE_URL || './data/mapa-sticker.db',
  DB_SSL: process.env.DB_SSL === 'true', // Supabase/Render: conexión cifrada
  PUBLIC_DIR: path.resolve(process.cwd(), 'public'),
  UPLOAD_STICKERS_DIR: path.resolve(process.cwd(), 'public/uploads/stickers'),
  UPLOAD_AVATARS_DIR: path.resolve(process.cwd(), 'public/uploads/avatars'),
  MAX_FILE_SIZE: 8 * 1024 * 1024, // 8 MB
};

module.exports = env;
