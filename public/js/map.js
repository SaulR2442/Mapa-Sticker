// Módulo del mapa: Leaflet + tiles CartoDB (claro/oscuro) + markers/rutas
import { api } from './api.js';
import { categoryMeta, escapeHtml, formatDate, avatarHtml } from './utils.js';
import { state } from './state.js';

const TILES = {
  light: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
  dark: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
};
const ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>';

export const MY_COLOR = '#a855f7';
export const FRIEND_COLORS = ['#f59e0b', '#a855f7', '#84cc16', '#fb7185', '#f97316', '#ec4899', '#eab308', '#c084fc'];

let map = null;
let tileLayer = null;
let markerLayer = L.layerGroup();
let routeLayer = L.layerGroup();
let hintEl = null;
const pickers = []; // mini mapas de los formularios

// Scope actual: { users: [{ username, display_name, color, stickers: [], route: [] }] }
let currentScope = null;
let refreshFn = null; // callback para volver a cargar el scope (p.ej. tras borrar un sticker)

export function initMap(containerId, theme, onRefresh) {
  map = L.map(containerId, { zoomControl: true });
  map.setView([4.711, -74.0721], 6); // Colombia
  tileLayer = L.tileLayer(TILES[theme] || TILES.light, { attribution: ATTRIBUTION, maxZoom: 19 });
  tileLayer.addTo(map);
  markerLayer.addTo(map);
  routeLayer.addTo(map);
  refreshFn = onRefresh;

  // Fuerza el cálculo del tamaño real del contenedor tras el primer layout.
  // Si Leaflet se inicializa con tamaño 0 (flex/hidden), los tiles no aparecen.
  requestAnimationFrame(() => map.invalidateSize());
  setTimeout(() => map.invalidateSize(), 150);
  window.addEventListener('resize', () => { if (map) map.invalidateSize(); });

  // Delegación de eventos del popup (like y eliminar)
  map.on('popupopen', () => {
    document.querySelectorAll('.ms-popup [data-like]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        btn.disabled = true;
        try {
          const res = await api.post(`/stickers/${btn.dataset.like}/like`, {});
          btn.dataset.liked = res.liked ? '1' : '0';
          btn.classList.toggle('bg-rose-500/15', res.liked);
          btn.classList.toggle('border-rose-400', res.liked);
          btn.classList.toggle('dark:border-rose-700', res.liked);
          btn.classList.toggle('text-rose-500', res.liked);
          btn.classList.toggle('border-slate-300', !res.liked);
          btn.classList.toggle('dark:border-slate-700', !res.liked);
          btn.classList.toggle('text-slate-500', !res.liked);
          btn.classList.toggle('dark:text-slate-400', !res.liked);
          btn.querySelector('.like-count').textContent = res.likes_count;
        } catch (err) {
          toastSafe(err.message, 'error');
        }
        btn.disabled = false;
      });
    });
    document.querySelectorAll('.ms-popup [data-del]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        btn.disabled = true;
        try {
          await api.del(`/stickers/${btn.dataset.del}`);
          toastSafe('Sticker eliminado', 'ok');
          if (refreshFn) await refreshFn();
        } catch (err) {
          toastSafe(err.message, 'error');
        }
      });
    });
  });

  return map;
}

let toastSafe = () => {};

export function setToast(fn) { toastSafe = fn; }

export function destroy() {
  if (map) {
    map.remove();
    map = null;
    tileLayer = null;
  }
  markerLayer = L.layerGroup();
  routeLayer = L.layerGroup();
  hintEl = null;
  currentScope = null;
}

export function setTheme(theme) {
  if (!map || !tileLayer) return;
  tileLayer.remove();
  tileLayer = L.tileLayer(TILES[theme] || TILES.light, { attribution: ATTRIBUTION, maxZoom: 19 });
  tileLayer.addTo(map);
  map.invalidateSize(); // re-render tras cambiar de capa
  pickers.forEach((p) => p.setTheme(theme));
}

export function currentTheme() {
  return state.user?.theme || localStorage.getItem('ms_theme') || 'light';
}

// ---- Render ----
function pinIcon(color, thumb) {
  return L.divIcon({
    className: 'sticker-pin-wrap',
    html: `<div class="sticker-pin" style="--pin-color:${color}">${thumb ? `<img src="${escapeHtml(thumb)}" alt="">` : ''}</div>`,
    iconSize: [42, 50],
    iconAnchor: [21, 50],
    popupAnchor: [0, -50],
  });
}

function popupContent(sticker, isMine) {
  const cat = categoryMeta(sticker.category);
  const tags = (Array.isArray(sticker.tags) ? sticker.tags : []).map((t) => `<span class="tag-chip">#${escapeHtml(t)}</span>`).join('');
  return `
  <div class="ms-popup">
    <img class="ms-popup-img" src="${escapeHtml(sticker.image_url)}" alt="${escapeHtml(sticker.title)}">
    <div class="mt-2 flex items-center gap-2">
      ${avatarHtml({ display_name: sticker.display_name, username: sticker.username, avatar: sticker.user_avatar }, 'w-6 h-6 text-[10px]')}
      <span class="text-xs font-medium truncate">${escapeHtml(sticker.display_name)} <span class="opacity-60">@${escapeHtml(sticker.username)}</span></span>
    </div>
    <div class="mt-1.5 flex items-start justify-between gap-2">
      <h4 class="font-bold leading-tight">${escapeHtml(sticker.title)}</h4>
      <span class="shrink-0 text-[10px] font-bold uppercase tracking-wide text-white px-2 py-0.5 rounded-full" style="background:${cat.color}">${escapeHtml(cat.label)}</span>
    </div>
    <div class="text-[11px] opacity-70 mt-0.5">📅 ${formatDate(sticker.taken_at || sticker.created_at)}</div>
    ${tags ? `<div class="mt-1.5">${tags}</div>` : ''}
    ${sticker.description ? `<p class="text-xs mt-1.5 opacity-80 leading-snug">${escapeHtml(sticker.description)}</p>` : ''}
    <div class="flex items-center gap-2 mt-2">
      <button data-like="${sticker.id}" data-liked="${sticker.liked_by_me ? '1' : '0'}" class="like-btn flex-1 text-xs font-bold py-1.5 rounded-lg border transition ${sticker.liked_by_me ? 'bg-rose-500/15 border-rose-400 dark:border-rose-700 text-rose-500' : 'border-slate-300 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-rose-500/10'}">❤️ <span class="like-count">${sticker.likes_count || 0}</span></button>
      ${isMine ? `<button data-del="${sticker.id}" class="flex-1 text-xs font-semibold py-1.5 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-300 dark:border-rose-800 hover:bg-rose-500 hover:text-white transition">🗑️ Eliminar</button>` : ''}
    </div>
  </div>`;
}

function applyFilter(stickers) {
  return stickers.filter((s) => {
    if (!state.categories.has(s.category)) return false;
    if (state.tagQuery && !(s.tags || []).some((t) => t.toLowerCase().includes(state.tagQuery))) return false;
    return true;
  });
}

export function renderScope(scope) {
  currentScope = scope;
  redraw();
}

export function redraw() {
  if (!map || !currentScope) return;
  markerLayer.clearLayers();
  routeLayer.clearLayers();

  // El contenedor puede cambiar de tamaño (sidebar móvil, resize, cambio de vista)
  map.invalidateSize();

  const allFiltered = [];
  currentScope.users.forEach((user) => {
    const filtered = applyFilter(user.stickers || []);
    filtered.forEach((s) => {
      const isMine = s.user_id === state.user?.id;
      const marker = L.marker([s.lat, s.lng], { icon: pinIcon(user.color, s.image_url) });
      marker.bindPopup(popupContent(s, isMine));
      marker.on('popupopen', () => marker.getElement()?.classList.add('selected'));
      marker.on('popupclose', () => marker.getElement()?.classList.remove('selected'));
      markerLayer.addLayer(marker);
    });
    allFiltered.push(...filtered);

    if (state.showRoutes && filtered.length >= 2) {
      const points = [...filtered]
        .sort((a, b) => (a.taken_at || a.created_at || '').localeCompare(b.taken_at || b.created_at || ''))
        .map((s) => [s.lat, s.lng]);
      L.polyline(points, {
        color: user.color,
        weight: 3,
        opacity: 0.85,
        dashArray: '1 8',
        lineCap: 'round',
      }).addTo(routeLayer);
    }
  });

  // Hint de estado
  if (!hintEl) {
    hintEl = L.control({ position: 'topright' });
    hintEl.onAdd = () => {
      const div = L.DomUtil.create('div', '');
      div.id = 'map-hint';
      div.style.cssText = 'background:rgba(15,23,42,.85);color:#fff;padding:.625rem .875rem;border-radius:.75rem;font-size:.8125rem;display:none;max-width:15rem;';
      return div;
    };
    hintEl.addTo(map);
  }
  const hint = document.getElementById('map-hint');
  if (hint) {
    if (allFiltered.length === 0) {
      hint.style.display = 'block';
      if (!currentScope.users.length) {
        hint.textContent = '👥 Selecciona un amigo o la vista global para ver otros mapas.';
      } else if (currentScope.users.every((u) => (u.stickers || []).length === 0)) {
        hint.textContent = '🗺️ Aún no hay stickers aquí. ¡Sube el primero!';
      } else {
        hint.textContent = '🔍 Ningún sticker coincide con los filtros actuales.';
      }
    } else {
      hint.style.display = 'none';
    }
  }

  // Encaje de vista
  if (allFiltered.length) {
    const bounds = allFiltered.map((s) => [s.lat, s.lng]);
    map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
  }
}

// ---- Selector de ubicación (mini mapa dentro de formularios) ----
export function createPickerMap(container, theme, onPick) {
  const m = L.map(container, { zoomControl: false, attributionControl: false });
  m.setView([4.711, -74.0721], 12);
  let tiles = L.tileLayer(TILES[theme] || TILES.light, { attribution: ATTRIBUTION, maxZoom: 19 });
  tiles.addTo(m);
  let marker = null;
  const picker = { setTheme: null }; // placeholder para el registro
  pickers.push(picker);

  m.on('click', (e) => {
    setPoint(e.latlng.lat, e.latlng.lng);
  });

  function setPoint(lat, lng) {
    if (marker) m.removeLayer(marker);
    marker = L.marker([lat, lng]).addTo(m);
    m.panTo([lat, lng]);
    onPick(lat, lng);
  }

  picker.setPoint = setPoint;
  picker.clear = () => {
    if (marker) { m.removeLayer(marker); marker = null; }
    onPick(null, null);
  };
  picker.setTheme = (t) => {
    tiles.remove();
    tiles = L.tileLayer(TILES[t] || TILES.light, { attribution: ATTRIBUTION, maxZoom: 19 });
    tiles.addTo(m);
  };

  return picker;
}
