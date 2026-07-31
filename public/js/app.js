// Punto de entrada: arranque, sesión y tema
import { state } from './state.js';
import { api, setToken, getToken } from './api.js';
import { toast } from './utils.js';
import { renderAuth } from './views/auth.js';
import { renderShell, applyTheme } from './views/app.js';

async function startSession(res) {
  setToken(res.token);
  state.user = res.user;
  applyTheme(res.user.theme || localStorage.getItem('ms_theme') || 'light');
  renderShell();
}

function logout() {
  setToken(null);
  state.user = null;
  state.mode = 'mine';
  state.friendUsername = null;
  state.friends = [];
  state.incomingCount = 0;
  state.categories = new Set(['arte', 'marca', 'viajes', 'eventos', 'personal', 'sin-categoria']);
  state.tagQuery = '';
  state.showRoutes = true;
  renderAuth();
}

// Sesión persistida: si hay token, validarlo contra /auth/me
async function boot() {
  if (!getToken()) return renderAuth();
  try {
    const { user } = await api.get('/auth/me');
    state.user = user;
    applyTheme(user.theme || localStorage.getItem('ms_theme') || 'light');
    renderShell();
  } catch {
    logout();
  }
}

window.addEventListener('ms:session-start', (e) => startSession(e.detail));
window.addEventListener('ms:logout', () => logout());

// PWA: registro del service worker (instalable + offline)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}

boot();
