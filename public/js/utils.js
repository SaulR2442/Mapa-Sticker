// Utilidades compartidas del frontend
export const CATEGORIES = [
  { id: 'arte', label: 'Arte Urbano', color: '#f43f5e' },
  { id: 'marca', label: 'Marca / Branding', color: '#f59e0b' },
  { id: 'viajes', label: 'Viajes / Turismo', color: '#3b82f6' },
  { id: 'eventos', label: 'Eventos', color: '#a855f7' },
  { id: 'personal', label: 'Personal', color: '#10b981' },
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

// Usa la ubicación del dispositivo como respaldo cuando la foto no trae GPS
export function getCurrentLocation(timeoutMs = 4000) {
  return new Promise((resolve) => {
    if (!('geolocation' in navigator)) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve(null),
      { timeout: timeoutMs, maximumAge: 60000, enableHighAccuracy: true }
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

export function initials(name) {
  return String(name || '?').trim().slice(0, 2).toUpperCase();
}

export function avatarHtml(user, cls = 'w-9 h-9 text-sm') {
  const name = user.display_name || user.username || '?';
  if (user.avatar) {
    return `<img src="${escapeHtml(user.avatar)}" alt="" class="${cls} rounded-full object-cover border border-slate-300 dark:border-slate-700">`;
  }
  return `<div class="${cls} rounded-full flex items-center justify-center bg-gradient-to-br from-rose-400 to-violet-500 text-white font-bold select-none">${initials(name)}</div>`;
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
