const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const CATEGORIES = [
  { id: 'arte', label: 'Arte Urbano', color: '#f43f5e' },
  { id: 'marca', label: 'Marca / Branding', color: '#f59e0b' },
  { id: 'viajes', label: 'Viajes / Turismo', color: '#3b82f6' },
  { id: 'eventos', label: 'Eventos', color: '#a855f7' },
  { id: 'personal', label: 'Personal', color: '#10b981' },
];

const CATEGORY_IDS = CATEGORIES.map((c) => c.id);

// Categoría por defecto cuando el usuario no elige ninguna
const NO_CATEGORY = 'sin-categoria';

function categoryMeta(id) {
  if (!id || id === NO_CATEGORY) return { id: NO_CATEGORY, label: 'Sin categoría', color: '#64748b' };
  return CATEGORIES.find((c) => c.id === id) || { id, label: id, color: '#64748b' };
}

function isValidEmail(v) {
  return typeof v === 'string' && EMAIL_RE.test(v);
}

function isValidUsername(v) {
  return typeof v === 'string' && /^[a-zA-Z0-9_]{3,20}$/.test(v);
}

function isValidPassword(v) {
  return typeof v === 'string' && v.length >= 6;
}

// Normaliza etiquetas: "#Graffiti, skate #bogota" -> ["graffiti", "skate", "bogota"]
function parseTags(input) {
  if (!input || typeof input !== 'string') return [];
  const seen = new Set();
  return input
    .split(/[#,\s]+/)
    .map((t) => t.trim().toLowerCase())
    .filter((t) => t.length > 0 && t.length <= 30)
    .filter((t) => (seen.has(t) ? false : (seen.add(t), true)))
    .slice(0, 12);
}

function isFiniteNumber(v) {
  return typeof v === 'number' && Number.isFinite(v);
}

// Convierte "12.3" -> 12.3 (o null si no es número válido)
function toNumber(v) {
  if (v === undefined || v === null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

module.exports = {
  CATEGORIES,
  CATEGORY_IDS,
  NO_CATEGORY,
  categoryMeta,
  isValidEmail,
  isValidUsername,
  isValidPassword,
  parseTags,
  isFiniteNumber,
  toNumber,
};
