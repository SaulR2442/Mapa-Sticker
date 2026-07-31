# Imagen base con glibc (compatible con los prebuilds de better-sqlite3)
FROM node:22-bookworm-slim

WORKDIR /app

# Herramientas para compilar better-sqlite3 si no hay prebuild disponible
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

# Instalar dependencias de producción (con lockfile para builds reproducibles)
COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

ENV NODE_ENV=production
ENV PORT=3000
ENV DB_DRIVER=sqlite
ENV DATABASE_URL=/data/mapa-sticker.db

EXPOSE 3000

# /data es el volumen para la base SQLite (montado por Render/Railway)
VOLUME ["/data"]

CMD ["node", "src/server.js"]
