require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');

const { initDb } = require('./db');
const { migrateLocalImagesToSupabase } = require('./services/migrateImages');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Archivos subidos y frontend estático.
// /uploads expone explícitamente la carpeta de subidas (fallback local de
// desarrollo; en producción las imágenes viven en Supabase Storage).
app.use('/uploads', express.static(path.join(__dirname, '..', 'public', 'uploads')));
app.use(express.static(path.join(__dirname, '..', 'public')));

// API
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/users', require('./routes/users.routes'));
app.use('/api/stickers', require('./routes/stickers.routes'));
app.use('/api/friends', require('./routes/friends.routes'));
app.use('/api/stats', require('./routes/stats.routes'));

app.get('/api/health', (req, res) => res.json({ ok: true }));

// SPA fallback
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// Error handler
app.use((err, req, res, next) => {
  console.error(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} ->`, err);
  if (err.code) {
    console.error('[db] Detalle:', { code: err.code, detail: err.detail, hint: err.hint, constraint: err.constraint, table: err.table });
  }
  if (res.headersSent) return next(err);
  res.status(err.status || 500).json({ error: 'Error interno del servidor' });
});

const PORT = process.env.PORT || 3000;

initDb()
  .then(async () => {
    await migrateLocalImagesToSupabase().catch((err) => {
      console.error('[storage] Migracion de imagenes fallida:', err);
    });
    app.listen(PORT, () => {
      console.log(`🗺️  Mapa Sticker corriendo en http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Error inicializando la base de datos:', err);
    process.exit(1);
  });
