// Vista principal: shell (topbar + sidebar + mapa) y modales (subida, perfil, amigos)
import { state } from '../state.js';
import { api } from '../api.js';
import { CATEGORIES, categoryMeta, escapeHtml, avatarHtml, toast, debounce, plural, todayISO, compressImage, getCurrentLocation, playSlap, unlockAudio } from '../utils.js';
import * as map from '../map.js';

const { MY_COLOR, FRIEND_COLORS } = map;

// ---------------- Shell ----------------
export function renderShell() {
  map.destroy();
  const root = document.getElementById('app-root');
  root.innerHTML = shellHTML();

  map.setToast(toast);
  map.initMap('map-container', currentTheme(), () => loadScope());
  paintChrome();
  wireShell();
  refreshFriends().then(loadScope);
}

// Desbloquea WebAudio con el primer gesto (requisito de autoplay para el slap)
['pointerdown', 'keydown'].forEach((ev) =>
  document.addEventListener(ev, unlockAudio, { once: true })
);

function shellHTML() {
  return `
  <div class="h-screen flex flex-col">
    <header class="app-header h-14 shrink-0 flex items-center gap-3 px-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-sm z-10">
      <button id="btn-hamburger" aria-label="Abrir menú de filtros" class="md:hidden w-11 h-11 shrink-0 flex items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition text-xl">☰</button>
      <div class="text-2xl">🗺️📌</div>
      <h1 class="font-black text-lg tracking-tight hidden sm:block">Mapa<span class="text-indigo-500">Sticker</span></h1>
      <button id="btn-upload" class="ml-2 hidden md:inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-sm font-bold shadow-lg shadow-indigo-600/25 transition">
        📌 Subir sticker
      </button>
      <div class="ml-auto flex items-center gap-2">
        <button id="btn-theme" title="Cambiar tema" class="w-11 h-11 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition text-lg">🌙</button>
        <div class="relative">
          <button id="btn-menu" class="w-11 h-11 rounded-full hover:opacity-90 transition"></button>
          <div id="user-menu" class="hidden absolute right-0 top-12 w-60 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl overflow-hidden text-sm z-[1200]">
            <div class="px-4 py-3 border-b border-slate-100 dark:border-slate-800">
              <p id="menu-name" class="font-bold truncate"></p>
              <p id="menu-sub" class="text-xs opacity-60 truncate"></p>
            </div>
            <button data-menu-item="profile" class="menu-item">👤 Mi perfil</button>
            <button data-menu-item="friends" class="menu-item">👥 Amigos<span id="menu-incoming" class="hidden ml-auto text-[10px] bg-rose-500 text-white rounded-full px-1.5 py-0.5"></span></button>
            <button data-menu-item="logout" class="menu-item text-rose-500">🚪 Cerrar sesión</button>
          </div>
        </div>
      </div>
    </header>

    <div class="flex flex-1 min-h-0">
      <aside id="sidebar" class="fixed inset-y-0 left-0 z-[1000] w-72 md:w-64 lg:w-72 -translate-x-full md:translate-x-0 md:static md:z-auto transition-transform duration-200 bg-slate-100 dark:bg-slate-950 overflow-hidden">
        <div class="flex flex-col h-full gap-4 p-4 overflow-y-auto">
          <div class="md:hidden flex items-center justify-between">
            <span class="font-black">Filtros y opciones</span>
            <button id="sidebar-close" aria-label="Cerrar menú" class="w-11 h-11 flex items-center justify-center rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700">✕</button>
          </div>
          <button id="btn-upload-mobile" class="md:hidden py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-sm font-bold">📌 Subir sticker</button>

          <div>
            <h3 class="text-[11px] uppercase tracking-wider font-bold opacity-50 mb-2">Vista del mapa</h3>
            <div id="view-mode" class="grid grid-cols-3 gap-1 bg-slate-200 dark:bg-slate-800 rounded-xl p-1 text-xs font-semibold">
              <button data-mode="mine" class="mode-btn rounded-lg py-3 transition">Mi Mapa</button>
              <button data-mode="friend" class="mode-btn rounded-lg py-3 transition">Amigo</button>
              <button data-mode="global" class="mode-btn rounded-lg py-3 transition">Global</button>
            </div>
            <div id="friend-picker" class="hidden mt-2">
              <select id="friend-select" class="w-full text-sm px-3 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"></select>
            </div>
          </div>

          <div class="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm">
            <div class="flex items-center justify-between mb-3">
              <h3 class="text-[11px] uppercase tracking-wider font-bold opacity-50">Filtros</h3>
              <button id="cat-all" class="text-xs font-bold text-indigo-500 hover:text-indigo-400 transition px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">Ver todas</button>
            </div>
            <div id="cat-filters" class="space-y-2"></div>
            <input id="tag-filter" placeholder="🔍 Etiqueta (ej. graffiti)"
              class="mt-3 w-full text-sm px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:opacity-50">
            <label class="flex items-center gap-2 mt-3 text-xs font-medium cursor-pointer">
              <input id="routes-toggle" type="checkbox" checked class="accent-cyan-500 w-4 h-4">
              Trazar ruta del recorrido
            </label>
          </div>

          <div class="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm">
            <h3 class="text-[11px] uppercase tracking-wider font-bold opacity-50 mb-3">Amigos</h3>
            <ul id="friend-list" class="space-y-1 text-sm max-h-44 overflow-y-auto"></ul>
            <button id="btn-friends" class="mt-3 w-full text-xs font-bold py-3 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition">👥 Gestionar amigos</button>
          </div>

          <div class="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm">
            <h3 class="text-[11px] uppercase tracking-wider font-bold opacity-50 mb-3">🏆 Ranking</h3>
            <ul id="rank-list" class="space-y-1 text-sm"></ul>
          </div>

          <div class="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm">
            <h3 class="text-[11px] uppercase tracking-wider font-bold opacity-50 mb-3">Leyenda</h3>
            <div id="legend" class="space-y-1.5 text-xs"></div>
          </div>
        </div>
      </aside>
      <div id="sidebar-backdrop" class="fixed inset-0 bg-black/50 z-[950] hidden md:hidden"></div>

      <main class="relative flex-1 min-w-0">
        <div id="map-container" class="absolute inset-0"></div>
        <button id="btn-fab" aria-label="Subir sticker" title="Subir sticker"
          class="app-fab md:hidden absolute bottom-5 right-4 z-[500] w-14 h-14 rounded-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-2xl shadow-xl shadow-indigo-600/40 flex items-center justify-center active:scale-90 transition">📌</button>
      </main>
    </div>
  </div>`;
}

function currentTheme() {
  return state.user?.theme || localStorage.getItem('ms_theme') || 'light';
}

export function applyTheme(theme) {
  document.documentElement.classList.toggle('dark', theme === 'dark');
  localStorage.setItem('ms_theme', theme);
  map.setTheme(theme);
  const btn = document.getElementById('btn-theme');
  if (btn) btn.textContent = theme === 'dark' ? '☀️' : '🌙';
  if (state.user && state.user.theme !== theme) {
    state.user.theme = theme;
    api.put('/users/me', { theme }).catch(() => {});
  }
}

function paintChrome() {
  const user = state.user;
  const btnMenu = document.getElementById('btn-menu');
  if (btnMenu) btnMenu.innerHTML = avatarHtml(user);
  const name = document.getElementById('menu-name');
  if (name) name.textContent = user.display_name;
  const sub = document.getElementById('menu-sub');
  if (sub) sub.textContent = `@${user.username} · ${plural(user.sticker_count ?? 0, 'sticker', 'stickers')}`;
  paintIncomingBadge();
}

function paintIncomingBadge() {
  const badge = document.getElementById('menu-incoming');
  if (badge) {
    if (state.incomingCount > 0) {
      badge.textContent = state.incomingCount;
      badge.classList.remove('hidden');
    } else {
      badge.classList.add('hidden');
    }
  }
}

// ---------------- Eventos del shell ----------------
function wireShell() {
  // Menú de usuario
  const menu = document.getElementById('user-menu');
  document.getElementById('btn-menu').addEventListener('click', (e) => {
    e.stopPropagation();
    menu.classList.toggle('hidden');
  });
  document.addEventListener('click', (e) => {
    if (!menu.classList.contains('hidden') && !menu.contains(e.target)) menu.classList.add('hidden');
  });
  menu.querySelectorAll('[data-menu-item]').forEach((btn) => {
    btn.addEventListener('click', () => {
      menu.classList.add('hidden');
      const item = btn.dataset.menuItem;
      if (item === 'profile') openProfileModal();
      if (item === 'friends') openFriendsModal();
      if (item === 'logout') window.dispatchEvent(new CustomEvent('ms:logout'));
    });
  });

  // Tema
  document.getElementById('btn-theme').addEventListener('click', () => {
    applyTheme(document.documentElement.classList.contains('dark') ? 'light' : 'dark');
  });

  // Subida
  const onUpload = () => { closeSidebar(); openUploadModal(); };
  document.getElementById('btn-upload').addEventListener('click', onUpload);
  document.getElementById('btn-upload-mobile').addEventListener('click', onUpload);
  document.getElementById('btn-fab').addEventListener('click', onUpload);

  // Sidebar móvil (hamburguesa en la navbar)
  document.getElementById('btn-hamburger').addEventListener('click', () => {
    const sidebar = document.getElementById('sidebar');
    const isOpen = !sidebar.classList.contains('-translate-x-full');
    if (isOpen) closeSidebar();
    else openSidebar();
  });
  document.getElementById('sidebar-close').addEventListener('click', closeSidebar);
  document.getElementById('sidebar-backdrop').addEventListener('click', closeSidebar);

  // Modo de vista
  const modeButtons = document.querySelectorAll('#view-mode .mode-btn');
  function paintMode() {
    modeButtons.forEach((b) => {
      const active = b.dataset.mode === state.mode;
      b.className = `mode-btn rounded-lg py-2 transition ${active
        ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-sm'
        : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`;
    });
    document.getElementById('friend-picker').classList.toggle('hidden', state.mode !== 'friend');
    if (state.mode === 'friend' && !state.friendUsername && state.friends.length) {
      state.friendUsername = state.friends[0].username;
      paintFriendSelect();
    }
  }
  modeButtons.forEach((b) => b.addEventListener('click', () => {
    state.mode = b.dataset.mode;
    paintMode();
    loadScope();
  }));

  const friendSelect = document.getElementById('friend-select');
  friendSelect.addEventListener('change', () => {
    state.friendUsername = friendSelect.value;
    loadScope();
  });

  // Filtros
  document.getElementById('tag-filter').addEventListener('input', debounce((e) => {
    state.tagQuery = e.target.value.trim().toLowerCase().replace(/^#/, '');
    map.redraw();
  }, 250));
  document.getElementById('routes-toggle').addEventListener('change', (e) => {
    state.showRoutes = e.target.checked;
    map.redraw();
  });
  document.getElementById('cat-filters').addEventListener('change', (e) => {
    if (!e.target.matches('input[type="checkbox"]')) return;
    if (e.target.checked) state.categories.add(e.target.value);
    else state.categories.delete(e.target.value);
    map.redraw();
  });

  document.getElementById('cat-all').addEventListener('click', () => {
    state.categories = new Set(CATEGORIES.map((c) => c.id).concat(['sin-categoria']));
    document.querySelectorAll('#cat-filters input[type="checkbox"]').forEach((i) => { i.checked = true; });
    const tag = document.getElementById('tag-filter');
    tag.value = '';
    state.tagQuery = '';
    map.redraw();
  });

  document.getElementById('btn-friends').addEventListener('click', openFriendsModal);

  paintMode();
  paintCategoryFilters();
  paintLegend();
}

function paintCategoryFilters() {
  const el = document.getElementById('cat-filters');
  const cats = CATEGORIES.concat([{ id: 'sin-categoria', label: 'Sin categoría', color: '#64748b' }]);
  el.innerHTML = cats.map((c) => `
    <label class="flex items-center gap-2 text-xs font-medium cursor-pointer">
      <input type="checkbox" value="${c.id}" checked class="w-3.5 h-3.5 accent-indigo-500">
      <span class="w-3 h-3 rounded-full shrink-0" style="background:${c.color}"></span>
      ${escapeHtml(c.label)}
    </label>`).join('');
}

function paintLegend() {
  const el = document.getElementById('legend');
  const rows = CATEGORIES.concat([{ id: 'sin-categoria', label: 'Sin categoría', color: '#64748b' }])
    .map((c) => `
    <div class="flex items-center gap-2">
      <span class="w-3 h-3 rounded-full shrink-0" style="background:${c.color}"></span>
      <span class="truncate">${escapeHtml(c.label)}</span>
    </div>`).join('');
  const routeRow = `
    <div class="flex items-center gap-2">
      <span class="inline-block w-6 h-0.5 rounded-full border-t-2 border-dashed border-cyan-400"></span>
      <span>Ruta cronológica</span>
    </div>`;
  el.innerHTML = rows + routeRow;
}

function paintFriendSelect() {
  const select = document.getElementById('friend-select');
  select.innerHTML = state.friends.length
    ? state.friends.map((f) => `
        <option value="${escapeHtml(f.username)}" ${f.username === state.friendUsername ? 'selected' : ''}>
          ${escapeHtml(f.display_name)} (@${escapeHtml(f.username)})
        </option>`).join('')
    : '<option value="">No tienes amigos aún</option>';
}

function paintFriendList() {
  const list = document.getElementById('friend-list');
  list.innerHTML = state.friends.length
    ? state.friends.map((f) => `
        <li>
          <button data-view-friend="${escapeHtml(f.username)}" class="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition text-left">
            ${avatarHtml(f, 'w-8 h-8 text-[11px]')}
            <span class="truncate font-medium">${escapeHtml(f.display_name)}</span>
            <span class="opacity-50 text-xs">@${escapeHtml(f.username)}</span>
          </button>
        </li>`).join('')
    : '<li class="text-xs opacity-50">Agrega amigos para ver sus mapas 👥</li>';
  list.querySelectorAll('[data-view-friend]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.mode = 'friend';
      state.friendUsername = btn.dataset.viewFriend;
      document.querySelectorAll('#view-mode .mode-btn').forEach((b) => {
        b.className = `mode-btn rounded-lg py-2 transition ${b.dataset.mode === 'friend'
          ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-sm'
          : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`;
      });
      document.getElementById('friend-picker').classList.remove('hidden');
      paintFriendSelect();
      closeSidebar();
      loadScope();
    });
  });
}

// ---------------- Datos ----------------
export async function refreshFriends() {
  try {
    const res = await api.get('/friends');
    state.friends = res.accepted;
    state.incomingCount = res.incoming.length;
    if (state.friendUsername && !state.friends.some((f) => f.username === state.friendUsername)) {
      state.friendUsername = state.friends[0]?.username || null;
    }
    paintFriendSelect();
    paintFriendList();
    paintIncomingBadge();
  } catch { /* silencioso */ }
}

const MEDALS = ['🥇', '🥈', '🥉'];

async function loadRanking() {
  try {
    const { users } = await api.get('/stats/leaderboard');
    const list = document.getElementById('rank-list');
    if (!list) return;
    list.innerHTML = users.map((u, i) => `
      <li class="flex items-center gap-2 ${u.is_me ? 'bg-indigo-50 dark:bg-indigo-500/10 rounded-lg px-1.5 py-0.5' : ''}">
        <span class="w-6 text-center shrink-0 text-xs">${MEDALS[i] || `${i + 1}.`}</span>
        ${avatarHtml(u, 'w-6 h-6 text-[9px]')}
        <span class="truncate font-medium text-xs">${escapeHtml(u.display_name)}</span>
        <span class="ml-auto text-xs tabular-nums" title="${u.total} stickers en total">
          <b>${u.total}</b>${u.streak >= 2 ? ` <span class="text-orange-500">🔥${u.streak}</span>` : ''}${u.this_week ? ` <span class="text-indigo-400">📅${u.this_week}</span>` : ''}
        </span>
      </li>`).join('');
  } catch { /* silencioso */ }
}

async function loadScope() {
  if (!state.user) return;
  const me = state.user;
  try {
    let users = [];
    if (state.mode === 'mine') {
      const b = await api.get('/users/me/bundle');
      users = [{ username: b.user.username, display_name: b.user.display_name, color: MY_COLOR, stickers: b.stickers, route: b.route }];
      me.sticker_count = b.sticker_count;
    } else if (state.mode === 'friend') {
      if (!state.friendUsername) {
        map.renderScope({ users: [] });
        return;
      }
      const b = await api.get(`/users/${encodeURIComponent(state.friendUsername)}/bundle`);
      const idx = Math.max(0, state.friends.findIndex((f) => f.username === state.friendUsername));
      users = [{ username: b.user.username, display_name: b.user.display_name, color: FRIEND_COLORS[idx % FRIEND_COLORS.length], stickers: b.stickers, route: b.route }];
    } else {
      const [myBundle, ...friendBundles] = await Promise.all([
        api.get('/users/me/bundle'),
        ...state.friends.map((f) => api.get(`/users/${encodeURIComponent(f.username)}/bundle`)),
      ]);
      me.sticker_count = myBundle.sticker_count;
      users = [{ username: myBundle.user.username, display_name: myBundle.user.display_name, color: MY_COLOR, stickers: myBundle.stickers, route: myBundle.route }];
      friendBundles.forEach((b, i) => {
        users.push({
          username: b.user.username,
          display_name: b.user.display_name,
          color: FRIEND_COLORS[i % FRIEND_COLORS.length],
          stickers: b.stickers,
          route: b.route,
        });
      });
    }
    paintChrome();
    map.renderScope({ users });
    loadRanking();
  } catch (err) {
    toast(err.message, 'error');
  }
}

// ---------------- Modales ----------------
let currentModal = null;
let modalClose = () => {};

export function closeModal() {
  currentModal?.remove();
  currentModal = null;
  modalClose();
}

// Cerrar modales con Escape (buena práctica móvil/escritorio)
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && currentModal) closeModal();
});

function openModal({ title, content, onMount }) {
  closeModal();
  const overlay = document.createElement('div');
  overlay.className = 'ms-modal-overlay fixed inset-0 z-[1500] flex items-center justify-center bg-black/60 backdrop-blur-sm';
  overlay.innerHTML = `
    <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" data-close></div>
    <div class="ms-modal-panel relative w-full bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700">
      <div class="sticky top-0 z-10 flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
        <h2 class="text-lg font-bold">${title}</h2>
        <button data-close aria-label="Cerrar" class="w-11 h-11 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition">✕</button>
      </div>
      <div class="p-5">${content}</div>
    </div>`;
  document.body.appendChild(overlay);
  const close = () => overlay.remove();
  overlay.querySelectorAll('[data-close]').forEach((el) => el.addEventListener('click', () => {
    currentModal = null;
    overlay.remove();
  }));
  overlay.addEventListener('mousedown', (e) => { if (e.target === overlay) overlay.remove(); });
  currentModal = overlay;
  modalClose = close;
  if (onMount) onMount(overlay);
}

// --- Subida ---
function openUploadModal() {
  const today = todayISO();
  const catOptions = `<option value="">Seleccionar categoría (opcional)</option>`
    + CATEGORIES.map((c) => `<option value="${c.id}">${escapeHtml(c.label)}</option>`).join('');
  openModal({
    title: '📌 Subir sticker',
    content: `
    <div class="space-y-4">
      <div>
        <label class="block text-xs font-semibold mb-1.5 opacity-70">Imagen del sticker *</label>
        <label id="upload-drop" class="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-5 cursor-pointer hover:border-indigo-400 transition text-center">
          <input id="upload-file" type="file" accept="image/*" capture="environment" class="hidden">
          <span id="upload-placeholder" class="text-sm opacity-70">📷 Haz clic para tomar/fotografiar el sticker<br><span class="text-[11px]">En el celular abre la cámara directo · GPS por EXIF o ubicación actual</span></span>
          <img id="upload-preview" class="hidden max-h-44 rounded-lg shadow-md">
        </label>
      </div>
      <input id="upload-title" placeholder="Título del sticker *" class="w-full text-sm px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500">
      <div class="ms-upload-grid">
        <div>
          <label class="block text-xs font-semibold mb-1.5 opacity-70">Categoría</label>
          <select id="upload-category" class="w-full text-sm px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500">${catOptions}</select>
        </div>
        <div>
          <label class="block text-xs font-semibold mb-1.5 opacity-70">Fecha (opcional)</label>
          <input id="upload-date" type="date" value="${today}" class="w-full text-sm px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500">
        </div>
      </div>
      <div>
        <label class="block text-xs font-semibold mb-1.5 opacity-70">Etiquetas / hashtags</label>
        <input id="upload-tags" placeholder="#graffiti #bogota #skate" class="w-full text-sm px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500">
      </div>
      <textarea id="upload-desc" rows="2" placeholder="Descripción (opcional)" class="w-full text-sm px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"></textarea>
      <div>
        <label class="block text-xs font-semibold mb-1.5 opacity-70">Ubicación en el mapa</label>
        <div class="ms-loc-row">
          <button id="upload-geoloc" type="button" class="text-[11px] font-bold text-indigo-500 hover:text-indigo-400 transition">📍 Usar mi ubicación</button>
          <span id="upload-coords" class="ms-loc-coords text-[11px] font-mono opacity-60">haz clic para fijar 📍</span>
        </div>
        <div id="picker-map" class="h-56 rounded-xl border border-slate-300 dark:border-slate-700 overflow-hidden"></div>
      </div>
      <button id="upload-submit" class="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold text-sm shadow-lg shadow-indigo-600/25 transition disabled:opacity-50">Publicar sticker 📌</button>
    </div>`,
    onMount: (overlay) => {
      const fileInput = overlay.querySelector('#upload-file');
      const preview = overlay.querySelector('#upload-preview');
      const placeholder = overlay.querySelector('#upload-placeholder');

      const coordsEl = overlay.querySelector('#upload-coords');
      let picked = null;
      let uploadFile = null; // archivo final (comprimido)
      let originalFile = null; // imagen ORIGINAL (conserva el EXIF/GPS)
      let picker = null;

      const setPicked = (lat, lng) => {
        picked = (lat == null) ? null : { lat, lng };
        coordsEl.textContent = picked
          ? `${lat.toFixed(5)}, ${lng.toFixed(5)} ✅`
          : 'haz clic para fijar 📍';
      };
      picker = map.createPickerMap('picker-map', currentTheme(), setPicked);

      // GPS real del navegador: pide permisos al usuario y sitúa el pin en el mapa
      const tryGeolocation = async (silent = false) => {
        const pos = await getCurrentLocation(10000);
        if (pos) {
          picker.setPoint(pos.lat, pos.lng);
          if (!silent) toast('📍 Ubicación actual detectada', 'ok');
          return true;
        }
        if (!silent) toast('No se pudo obtener la ubicación: fija el punto en el mapa', 'info');
        return false;
      };

      // EXIF GPS de la foto original (la compresión después lo eliminaría)
      const applyExifGps = async () => {
        if (!window.exifr || !originalFile) return false;
        try {
          const gps = await window.exifr.gps(originalFile);
          if (gps && gps.latitude != null) {
            picker.setPoint(gps.latitude, gps.longitude);
            toast('📍 GPS encontrado en el EXIF de la foto', 'ok');
            return true;
          }
        } catch { /* sin EXIF */ }
        return false;
      };

      // Al abrir el modal pedimos permisos de GPS reales (dentro de la ventana
      // de activación del gesto del usuario) y al pulsar el botón explícito
      const geolocBtn = overlay.querySelector('#upload-geoloc');
      geolocBtn.addEventListener('click', () => { tryGeolocation(false); });
      setTimeout(() => { if (!picked) tryGeolocation(true); }, 400);

      fileInput.addEventListener('change', async () => {
        const original = fileInput.files[0];
        if (!original) return;
        originalFile = original;
        placeholder.classList.add('hidden');
        preview.src = URL.createObjectURL(original);
        preview.classList.remove('hidden');

        // GPS desde EXIF de la imagen ORIGINAL (la compresión lo elimina)
        const gpsFound = await applyExifGps();
        if (!gpsFound) tryGeolocation(true);

        // Compresión en el navegador (recorta peso y datos móviles)
        uploadFile = await compressImage(original);
        const kb = Math.round(uploadFile.size / 1024);
        if (uploadFile !== original) toast(`Imagen optimizada (${kb} KB)`, 'info');
      });

      overlay.querySelector('#upload-submit').addEventListener('click', async () => {
        const file = uploadFile || fileInput.files[0];
        const title = overlay.querySelector('#upload-title').value.trim();
        if (!file) return toast('Toma o elige una imagen', 'error');
        if (!title) return toast('Escribe un título', 'error');

        // Antes de enviar aseguramos coordenadas: EXIF > GPS del navegador > manual
        if (!picked) {
          const exifOk = await applyExifGps();
          if (!exifOk) await tryGeolocation(true);
        }
        if (!picked) return toast('Fija la ubicación en el mapa o usa 📍 tu ubicación', 'error');

        const fd = new FormData();
        fd.append('image', file);
        fd.append('title', title);
        fd.append('category', overlay.querySelector('#upload-category').value);
        fd.append('tags', overlay.querySelector('#upload-tags').value);
        fd.append('description', overlay.querySelector('#upload-desc').value.trim());
        fd.append('taken_at', overlay.querySelector('#upload-date').value);
        if (picked) {
          fd.append('lat', picked.lat);
          fd.append('lng', picked.lng);
        }

        const btn = overlay.querySelector('#upload-submit');
        btn.disabled = true;
        btn.textContent = 'Pegando…';
        try {
          await api.post('/stickers', fd);
          playSlap();
          toast('¡Sticker pegado! 📌', 'ok');
          closeModal();
          await loadScope();
        } catch (err) {
          toast(err.message, 'error');
          btn.disabled = false;
          btn.textContent = 'Publicar sticker 📌';
        }
      });
    },
  });
}

// --- Perfil ---
function openProfileModal() {
  const user = state.user;
  openModal({
    title: '👤 Mi perfil',
    content: `
    <div class="space-y-4">
      <div class="flex items-center gap-4">
        <div class="relative">
          <div id="profile-avatar">${avatarHtml(user, 'w-16 h-16 text-xl')}</div>
          <label class="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center text-sm cursor-pointer shadow-lg transition">
            ✏️<input id="profile-avatar-file" type="file" accept="image/*" class="hidden">
          </label>
        </div>
        <div class="min-w-0">
          <p class="font-bold text-sm truncate">@${escapeHtml(user.username)}</p>
          <p class="text-xs opacity-60 mt-0.5">${plural(user.sticker_count ?? 0, 'sticker', 'stickers')} · ${plural(user.friend_count ?? 0, 'amigo', 'amigos')}</p>
          <p class="text-[11px] opacity-50 mt-0.5">${escapeHtml(user.email)}</p>
        </div>
      </div>
      <div>
        <label class="block text-xs font-semibold mb-1.5 opacity-70">Nombre visible</label>
        <input id="profile-name" value="${escapeHtml(user.display_name)}" class="w-full text-sm px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500">
      </div>
      <div>
        <label class="block text-xs font-semibold mb-1.5 opacity-70">Biografía</label>
        <textarea id="profile-bio" rows="3" placeholder="Cuéntanos quién eres y qué stickers buscas…" class="w-full text-sm px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500">${escapeHtml(user.bio || '')}</textarea>
      </div>
      <button id="profile-save" class="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold text-sm shadow-lg shadow-indigo-600/25 transition disabled:opacity-50">Guardar cambios</button>
    </div>`,
    onMount: (overlay) => {
      const avatarBox = overlay.querySelector('#profile-avatar');
      const fileInput = overlay.querySelector('#profile-avatar-file');
      let newAvatar = null;
      fileInput.addEventListener('change', () => {
        const file = fileInput.files[0];
        if (!file) return;
        newAvatar = file;
        avatarBox.innerHTML = `<img src="${URL.createObjectURL(file)}" class="w-16 h-16 rounded-full object-cover border border-slate-300 dark:border-slate-700">`;
      });
      overlay.querySelector('#profile-save').addEventListener('click', async () => {
        const fd = new FormData();
        fd.append('displayName', overlay.querySelector('#profile-name').value.trim());
        fd.append('bio', overlay.querySelector('#profile-bio').value.trim());
        if (newAvatar) fd.append('avatar', newAvatar);
        const btn = overlay.querySelector('#profile-save');
        btn.disabled = true;
        btn.textContent = 'Guardando…';
        try {
          const res = await api.put('/users/me', fd);
          state.user = res.user;
          paintChrome();
          toast('Perfil actualizado ✅', 'ok');
          closeModal();
          await refreshFriends();
          await loadScope();
        } catch (err) {
          toast(err.message, 'error');
          btn.disabled = false;
          btn.textContent = 'Guardar cambios';
        }
      });
    },
  });
}

// --- Amigos ---
async function openFriendsModal() {
  const data = await api.get('/friends');
  state.incomingCount = data.incoming.length;
  paintIncomingBadge();

  openModal({
    title: '👥 Amigos',
    content: `
    <div class="space-y-5">
      <div>
        <input id="friend-search" placeholder="🔍 Buscar usuario por @username…"
          class="w-full text-sm px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500">
        <div id="friend-results" class="mt-2 space-y-2"></div>
      </div>
      <div>
        <h3 class="text-[11px] uppercase tracking-wider font-bold opacity-50 mb-2">Solicitudes recibidas
          <span id="incoming-count" class="ml-1 text-[10px] bg-rose-500 text-white rounded-full px-1.5 py-0.5">${data.incoming.length}</span>
        </h3>
        <div id="incoming-list" class="space-y-2">${emptyOrRows(data.incoming, incomingRow)}</div>
      </div>
      <div>
        <h3 class="text-[11px] uppercase tracking-wider font-bold opacity-50 mb-2">Mis amigos</h3>
        <div id="accepted-list" class="space-y-2">${emptyOrRows(data.accepted, acceptedRow)}</div>
      </div>
      <div>
        <h3 class="text-[11px] uppercase tracking-wider font-bold opacity-50 mb-2">Solicitudes enviadas</h3>
        <div id="outgoing-list" class="space-y-2">${emptyOrRows(data.outgoing, outgoingRow)}</div>
      </div>
    </div>`,
    onMount: (overlay) => {
      const resultsBox = overlay.querySelector('#friend-results');
      const searchInput = overlay.querySelector('#friend-search');

      const search = debounce(async () => {
        const q = searchInput.value.trim();
        if (!q) { resultsBox.innerHTML = ''; return; }
        try {
          const res = await api.get(`/users/search?q=${encodeURIComponent(q)}`);
          resultsBox.innerHTML = res.length
            ? res.map((u) => searchRow(u)).join('')
            : '<p class="text-xs opacity-50">Sin resultados 🙈</p>';
          wireSearchActions(overlay);
        } catch (err) {
          toast(err.message, 'error');
        }
      }, 300);
      searchInput.addEventListener('input', search);

      overlay.querySelectorAll('[data-accept]').forEach((btn) => btn.addEventListener('click', async () => {
        await api.post(`/friends/${btn.dataset.accept}/accept`, {});
        toast('¡Ahora son amigos! 🎉', 'ok');
        closeModal();
        await refreshFriends();
        await loadScope();
      }));
      overlay.querySelectorAll('[data-reject]').forEach((btn) => btn.addEventListener('click', async () => {
        await api.post(`/friends/${btn.dataset.reject}/reject`, {});
        closeModal();
        await refreshFriends();
        openFriendsModal();
      }));
      overlay.querySelectorAll('[data-cancel]').forEach((btn) => btn.addEventListener('click', async () => {
        await api.del(`/friends/${btn.dataset.cancel}`);
        closeModal();
        await refreshFriends();
        openFriendsModal();
      }));
      overlay.querySelectorAll('[data-unfriend]').forEach((btn) => btn.addEventListener('click', async () => {
        if (!confirm('¿Eliminar a este amigo?')) return;
        await api.del(`/friends/${btn.dataset.unfriend}`);
        toast('Amigo eliminado', 'info');
        closeModal();
        await refreshFriends();
        await loadScope();
        openFriendsModal();
      }));
      overlay.querySelectorAll('[data-view-friend]').forEach((btn) => btn.addEventListener('click', () => {
        state.mode = 'friend';
        state.friendUsername = btn.dataset.viewFriend;
        closeModal();
        document.querySelectorAll('#view-mode .mode-btn').forEach((b) => {
          b.className = `mode-btn rounded-lg py-2 transition ${b.dataset.mode === 'friend'
            ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-sm'
            : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`;
        });
        const pickerEl = document.getElementById('friend-picker');
        if (pickerEl) pickerEl.classList.remove('hidden');
        paintFriendSelect();
        loadScope();
      }));
    },
  });
}

function emptyOrRows(list, rowFn) {
  return list.length ? list.map(rowFn).join('') : '<p class="text-xs opacity-50">Nada por aquí</p>';
}

function rowBase(u) {
  return `${avatarHtml(u, 'w-8 h-8 text-[11px]')}
    <div class="min-w-0 flex-1">
      <p class="text-sm font-semibold truncate">${escapeHtml(u.display_name)}</p>
      <p class="text-[11px] opacity-50 truncate">@${escapeHtml(u.username)}${u.sticker_count ? ` · ${u.sticker_count} stickers` : ''}</p>
    </div>`;
}

function incomingRow(u) {
  return `<div class="flex flex-wrap items-center gap-3 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60">
    ${rowBase(u)}
    <button data-accept="${u.id}" class="text-[11px] font-bold px-3 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-white transition">Aceptar</button>
    <button data-reject="${u.id}" class="text-[11px] font-bold px-3 py-2.5 rounded-lg bg-rose-500/10 text-rose-500 border border-rose-300 dark:border-rose-800 hover:bg-rose-500 hover:text-white transition">Rechazar</button>
  </div>`;
}

function outgoingRow(u) {
  return `<div class="flex flex-wrap items-center gap-3 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60">
    ${rowBase(u)}
    <span class="text-[10px] font-bold uppercase tracking-wide bg-amber-500/15 text-amber-600 dark:text-amber-400 px-2 py-1 rounded-lg">Pendiente</span>
    <button data-cancel="${u.id}" class="text-[11px] font-bold px-3 py-2.5 rounded-lg bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 transition">Cancelar</button>
  </div>`;
}

function acceptedRow(u) {
  return `<div class="flex flex-wrap items-center gap-3 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60">
    ${rowBase(u)}
    <button data-view-friend="${escapeHtml(u.username)}" class="text-[11px] font-bold px-3 py-2.5 rounded-lg bg-indigo-500 hover:bg-indigo-400 text-white transition">Ver mapa</button>
    <button data-unfriend="${u.id}" class="text-[11px] font-bold px-3 py-2.5 rounded-lg bg-rose-500/10 text-rose-500 border border-rose-300 dark:border-rose-800 hover:bg-rose-500 hover:text-white transition">✕</button>
  </div>`;
}

function searchRow(u) {
  const badge = {
    accepted: '<span class="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">✓ Amigos</span>',
    pending_out: '<span class="text-[10px] font-bold text-amber-600 dark:text-amber-400">⏳ Enviada</span>',
    pending_in: `<button data-accept="${u.friend_id}" class="text-[11px] font-bold px-3 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-white transition">Aceptar</button>`,
    none: `<button data-request="${escapeHtml(u.username)}" class="text-[11px] font-bold px-3 py-2.5 rounded-lg bg-indigo-500 hover:bg-indigo-400 text-white transition">➕ Agregar</button>`,
  }[u.friend_status] || '';
  return `<div class="flex flex-wrap items-center gap-3 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60">
    ${rowBase(u)}${badge}
  </div>`;
}

function wireSearchActions(overlay) {
  overlay.querySelectorAll('[data-request]').forEach((btn) => btn.addEventListener('click', async () => {
    try {
      const res = await api.post('/friends/request', { username: btn.dataset.request });
      toast(res.accepted ? '¡Ahora son amigos! 🎉' : 'Solicitud enviada ✅', 'ok');
      closeModal();
      await refreshFriends();
      await loadScope();
    } catch (err) {
      toast(err.message, 'error');
    }
  }));
  overlay.querySelectorAll('[data-accept]').forEach((btn) => btn.addEventListener('click', async () => {
    try {
      await api.post(`/friends/${btn.dataset.accept}/accept`, {});
      toast('¡Ahora son amigos! 🎉', 'ok');
      closeModal();
      await refreshFriends();
      await loadScope();
    } catch (err) {
      toast(err.message, 'error');
    }
  }));
}

// ---------------- Sidebar móvil ----------------
function openSidebar() {
  document.getElementById('sidebar').classList.remove('-translate-x-full');
  document.getElementById('sidebar-backdrop').classList.remove('hidden');
}
function closeSidebar() {
  document.getElementById('sidebar').classList.add('-translate-x-full');
  document.getElementById('sidebar-backdrop').classList.add('hidden');
}
