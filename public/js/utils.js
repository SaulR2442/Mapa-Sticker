// Utilidades compartidas del frontend
// IDs estables (no romper datos en BD) con etiquetas estilo Spider-Verse
export const CATEGORIES = [
  { id: 'arte', label: 'Arte Urbano', color: '#fb7185' },
  { id: 'marca', label: 'Slaps', color: '#fbbf24' },
  { id: 'viajes', label: 'Pop Culture', color: '#60a5fa' },
  { id: 'eventos', label: 'Illegal Spot', color: '#c084fc' },
  { id: 'personal', label: 'Frases', color: '#34d399' },
];

export const NO_CATEGORY = 'sin-categoria';

export function categoryMeta(id) {
  if (!id || id === NO_CATEGORY) return { id: NO_CATEGORY, label: 'Sin categoría', color: '#64748b' };
  return CATEGORIES.find((c) => c.id === id) || { id, label: id, color: '#64748b' };
}

export function todayISO() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// Comprime la imagen en el navegador antes de subirla (ahorra datos móviles y
// almacenamiento). Nota: reescala a JPEG y por tanto ELIMINA el EXIF, por eso
// el GPS debe leerse de la imagen ORIGINAL antes de comprimir.
export async function compressImage(file, maxDim = 1280, quality = 0.82) {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
    if (scale === 1 && file.size < 300 * 1024) {
      bitmap.close();
      return file; // ya es liviana
    }
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const ctx = canvas.getContext('2d');
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
    if (!blob) return file;
    return new File([blob], file.name.replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' });
  } catch {
    return file; // sin soporte: subimos el original
  }
}

// Usa la ubicación del dispositivo como respaldo cuando la foto no trae GPS.
// enableHighAccuracy + timeout 10s: pide al navegador una posición GPS real.
export function getCurrentLocation(timeoutMs = 10000) {
  return new Promise((resolve) => {
    if (!('geolocation' in navigator)) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve(null),
      { timeout: timeoutMs, maximumAge: 0, enableHighAccuracy: true }
    );
  });
}

export function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (m) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[m]));
}

export function formatDate(value) {
  if (!value) return '—';
  const d = new Date(value.length <= 10 ? value + 'T00:00:00' : value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
}

// Fecha relativa con vibra de exploración en tiempo real: "hace 2 h", "ayer"…
export function timeAgo(value) {
  if (!value) return '';
  const d = new Date(value.length <= 10 ? value + 'T12:00:00' : value);
  if (Number.isNaN(d.getTime())) return '';
  const s = Math.max(0, (Date.now() - d.getTime()) / 1000);
  if (s < 60) return 'hace unos segundos';
  const m = Math.floor(s / 60);
  if (m < 60) return `hace ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `hace ${h} h`;
  const days = Math.floor(h / 24);
  if (days === 1) return 'ayer';
  if (days < 7) return `hace ${days} días`;
  const w = Math.floor(days / 7);
  if (w < 5) return `hace ${w} sem`;
  const mo = Math.floor(days / 30);
  if (mo < 12) return `hace ${mo} mes${mo === 1 ? '' : 'es'}`;
  const y = Math.floor(days / 365);
  return `hace ${y} año${y === 1 ? '' : 's'}`;
}

// Textura "slap" tipo grafiti (SVG embebido, sin red) para imágenes rotas
export const GRAFFITI_FALLBACK = 'data:image/svg+xml;utf8,' + encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 160">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#2e2232"/><stop offset="1" stop-color="#181216"/>
  </linearGradient></defs>
  <rect width="300" height="160" fill="url(#g)"/>
  <g fill="none" stroke-linecap="round" stroke-linejoin="round">
    <path d="M24 118 C 66 36, 112 142, 152 66 S 248 46, 278 108" stroke="#a855f7" stroke-width="3"/>
    <circle cx="196" cy="88" r="24" stroke="#fb7185" stroke-width="3"/>
    <path d="M58 60 l 10 -16 M68 44 l -6 12 M84 92 l 14 20" stroke="#c084fc" stroke-width="3"/>
    <path d="M232 52 l 14 8 M246 60 l -12 8 M262 96 l 6 14" stroke="#fbbf24" stroke-width="3"/>
    <path d="M120 126 q 8 -8 16 0" stroke="#34d399" stroke-width="3"/>
  </g>
  <text x="150" y="148" text-anchor="middle" font-family="Arial Black, Impact, sans-serif" font-size="20" letter-spacing="3" fill="#e9d5ff">SIN IMAGEN</text>
</svg>`);

// Convierte cualquier URL de imagen guardada en BD a una URL web usable:
// URLs http(s) y /ruta se usan tal cual; "ruta/relativa" se antepone con "/".
export function normalizeImageUrl(value) {
  if (!value) return '';
  if (value.startsWith('http://') || value.startsWith('https://')) return value;
  if (value.startsWith('/')) return value;
  return `/${value}`;
}

// <img> con fallback automático: si la URL falla, muestra la textura grafiti
export function stickerImg(sticker, cls = '') {
  const src = normalizeImageUrl(sticker.image_url || sticker.imageUrl || sticker.foto || '');
  const alt = sticker.title || '';
  return `<img class="${cls}" src="${escapeHtml(src)}" alt="${escapeHtml(alt)}" loading="lazy" onerror="this.onerror=null;this.src='${GRAFFITI_FALLBACK}'">`;
}

// "Slap": micro-sonido de impacto al pegar un sticker (WebAudio, sin assets)
let audioCtx = null;
function ensureAudio() {
  try {
    audioCtx ||= new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
  } catch { /* sin soporte */ }
  return audioCtx;
}
// Desbloquea el audio con el primer gesto del usuario (requisito de autoplay)
export function unlockAudio() {
  ensureAudio();
}
export function playSlap() {
  const ctx = ensureAudio();
  if (!ctx) return;
  try {
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(340, t);
    osc.frequency.exponentialRampToValueAtTime(85, t + 0.1);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.32, t + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.13);
  } catch { /* sin audio */ }
}

export function initials(name) {
  return String(name || '?').trim().slice(0, 2).toUpperCase();
}

export function avatarHtml(user, cls = 'w-9 h-9 text-sm') {
  const name = user.display_name || user.username || '?';
  if (user.avatar) {
    return `<img src="${escapeHtml(normalizeImageUrl(user.avatar))}" alt="" class="${cls} shrink-0 rounded-full object-cover border border-slate-300 dark:border-slate-700">`;
  }
  return `<div class="${cls} shrink-0 rounded-full flex items-center justify-center bg-gradient-to-br from-rose-400 to-violet-500 text-white font-bold select-none">${initials(name)}</div>`;
}

export function toast(message, type = 'info') {
  const root = document.getElementById('toast-root');
  const colors = {
    info: 'bg-slate-800 text-white',
    ok: 'bg-emerald-600 text-white',
    error: 'bg-rose-600 text-white',
  };
  const el = document.createElement('div');
  el.className = `${colors[type] || colors.info} px-4 py-3 rounded-xl shadow-lg text-sm font-medium flex items-start gap-2 animate-[fadeIn_.2s_ease]`;
  const icon = type === 'ok' ? '✅' : type === 'error' ? '⚠️' : '💡';
  el.innerHTML = `<span>${icon}</span><span>${escapeHtml(message)}</span>`;
  root.appendChild(el);
  setTimeout(() => el.remove(), 3800);
}

export function debounce(fn, ms = 300) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

// Contador de stickers formateado
export function plural(n, singular, pluralWord) {
  return `${n} ${n === 1 ? singular : pluralWord}`;
}
