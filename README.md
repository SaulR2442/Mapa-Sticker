# 🗺️📌 Mapa Sticker

Red social de **stickers geolocalizados** en un mapa interactivo: sube fotos de stickers, se ubican automáticamente por su **GPS (EXIF)**, agrega amigos y visualiza los recorridos que trazan sus stickers.

## Stack

- **Frontend:** HTML5 + Tailwind CSS (CDN) + JavaScript ES6 (módulos nativos)
- **Mapa:** Leaflet.js con tiles de CartoDB (claros/oscuros)
- **Backend:** Node.js + Express
- **Base de datos:** SQLite (`better-sqlite3`) con capa de repositorios abstraída (`src/db/`) lista para migrar a PostgreSQL/Supabase solo cambiando variables de entorno
- **Auth:** JWT + bcrypt · **EXIF:** `exifr`

## Requisitos

- Node.js 18+ (recomendado 20/22/24)
- Herramientas de compilación para `better-sqlite3` (en Linux: `build-essential`; en Windows: Visual Studio Build Tools). Si no hay, se puede usar `sqlite3` (npm) en su lugar.

## Instalación y ejecución

```bash
npm install
cp .env.example .env   # opcional: ajusta JWT_SECRET
npm run dev            # desarrollo (nodemon)
# o
npm start              # producción
```

Abre **http://localhost:3000**, crea una cuenta y empieza a pegar stickers 🎨

## Configuración (`.env`)

| Variable | Descripción |
|---|---|
| `PORT` | Puerto del servidor (3000) |
| `JWT_SECRET` | Clave para firmar tokens (¡cámbiala!) |
| `DB_DRIVER` | `sqlite` (local) o `postgres` (nube: Supabase, Neon) |
| `DATABASE_URL` | Ruta del archivo SQLite (`./data/...`) o cadena de conexión PostgreSQL |

El driver se elige solo por variables de entorno: `DB_DRIVER=postgres` + `DATABASE_URL` activan el driver `pg` en `src/db/postgres/`. Los controladores nunca tocan el driver directamente.

## ☁️ Despliegue (Render, gratis)

1. Sube el repo a GitHub.
2. En [render.com](https://render.com) → **New → Blueprint** y conecta el repo (usa el `render.yaml` incluido).
3. Render genera el `JWT_SECRET`, monta un **disco persistente** en `/data` y sirve la app con HTTPS en `https://tu-app.onrender.com`.

Alternativas:
- **Railway**: mismo Dockerfile, añade un volumen en `/data`.
- **Fly.io**: `fly launch` con el Dockerfile y volumen `fly volume create data`.
- **Vercel/Netlify**: solo si separas el frontend estático de `public/` de la API (no recomendado por simplicidad).

### Migrar la base a PostgreSQL (Supabase, free)

1. Crea un proyecto en [supabase.com](https://supabase.com) y copia la cadena de conexión.
2. En Render (Dashboard → tu servicio → Environment): `DB_DRIVER=postgres` y `DATABASE_URL=postgresql://...` (el esquema se crea solo al arrancar).
3. Sin datos que migrar aún, puedes simplemente cambiar el driver. Si ya tienes stickers, exporta `data/mapa-sticker.db` con `.dump` o usa la vista global para re-subir lo importante.

> ⚠️ **Imágenes:** hoy se guardan en `public/uploads/` (disco local). Con el disco persistente de Render sobreviven a los despliegues, pero para escalar conviene migrar a **Cloudinary/Supabase Storage** (próximo paso). Las fotos subidas desde el celular se comprimen en el navegador (~1280 px) para ahorrar datos y espacio.

## PWA

La app es instalable: en Android (Chrome) aparece "Instalar app" en el menú; en iOS usa "Añadir a pantalla de inicio". Incluye `manifest.webmanifest`, iconos y un service worker (`public/sw.js`) que cachea el shell y los CDN para funcionar offline en la carga inicial.

## Estructura

```
├── src/
│   ├── server.js               # Express + montado de rutas + estáticos
│   ├── config/env.js           # variables de entorno centralizadas
│   ├── db/
│   │   ├── index.js            # selector de driver (sqlite/postgres)
│   │   ├── database.js         # conexión + esquema SQLite
│   │   └── repositories/       # users, stickers, friendships
│   ├── middleware/             # auth (JWT), upload (multer)
│   ├── controllers/            # auth, users, stickers, friends
│   ├── routes/                 # /api/auth, /api/users, /api/stickers, /api/friends
│   └── utils/                  # exif, validación y categorías
├── public/
│   ├── index.html              # SPA
│   ├── css/                    # estilos personalizados
│   ├── js/                     # módulos ES6 (api, map, views…)
│   └── uploads/                # imágenes subidas (stickers y avatares)
└── data/                       # base de datos SQLite
```

## Funcionalidades

- Registro/login con JWT y sesión persistente
- Perfil editable (nombre, avatar, biografía) + **modo claro/oscuro** (UI y tiles del mapa)
- Subida de stickers: GPS automático desde EXIF o selección manual en el mapa, categorías (Arte Urbano, Marca, Viajes, Eventos, Personal) y etiquetas libres (#graffiti, #bogota…)
- Mapa interactivo con pines personalizados, popups con miniatura, filtros por categoría y búsqueda por etiquetas
- **Ruta cronológica**: línea que conecta los stickers de cada usuario por orden de fecha
- Sistema de amigos (solicitudes, aceptar/rechazar) y vistas: **Mi Mapa**, **Mapa de un Amigo** y **Global** (red de amigos)
