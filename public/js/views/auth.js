// Vista de autenticación: registro / inicio de sesión
import { api } from '../api.js';
import { toast } from '../utils.js';

const FIELD_CLS = 'w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm';

export function renderAuth() {
  const root = document.getElementById('app-root');
  let mode = 'login';

  root.innerHTML = `
  <div class="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-sky-500 via-indigo-500 to-fuchsia-500">
    <div class="w-full max-w-md">
      <div class="text-center mb-8">
        <div class="text-6xl mb-3">🗺️📌</div>
        <h1 class="text-4xl font-black text-white drop-shadow-lg">Mapa Sticker</h1>
        <p class="text-white/90 mt-2 font-medium">Una red social de stickers geolocalizados en el mapa del mundo</p>
      </div>
      <div class="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden">
        <div class="grid grid-cols-2 text-center font-semibold text-sm border-b border-slate-200 dark:border-slate-700">
          <button data-tab="login" class="py-3.5 text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-500 bg-indigo-50/50 dark:bg-slate-800/50">Iniciar sesión</button>
          <button data-tab="register" class="py-3.5 text-slate-500 dark:text-slate-400">Crear cuenta</button>
        </div>
        <div class="p-6">
          <form id="auth-form" class="space-y-4">
            <div id="auth-fields" class="space-y-4"></div>
            <div>
              <label class="block text-xs font-semibold mb-1.5 text-slate-600 dark:text-slate-300">Contraseña</label>
              <input name="password" type="password" required autocomplete="current-password" placeholder="••••••••" class="${FIELD_CLS}">
            </div>
            <button type="submit" id="auth-submit"
              class="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold text-sm shadow-lg shadow-indigo-600/30 transition disabled:opacity-50">
              Iniciar sesión
            </button>
          </form>
        </div>
      </div>
      <p class="text-center text-white/70 text-xs mt-6">HTML + Tailwind + Leaflet + Express + SQLite · Hecho para pegar stickers por el mundo 🌍</p>
    </div>
  </div>`;

  const tabLogin = root.querySelector('[data-tab="login"]');
  const tabRegister = root.querySelector('[data-tab="register"]');
  const fields = root.querySelector('#auth-fields');
  const submit = root.querySelector('#auth-submit');

  const ACTIVE = 'py-3.5 text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-500 bg-indigo-50/50 dark:bg-slate-800/50';
  const IDLE = 'py-3.5 text-slate-500 dark:text-slate-400';

  function setTab(next) {
    mode = next;
    tabLogin.className = next === 'login' ? ACTIVE : IDLE;
    tabRegister.className = next === 'register' ? ACTIVE : IDLE;
    submit.textContent = next === 'login' ? 'Iniciar sesión' : 'Crear cuenta 🚀';
    fields.innerHTML = next === 'login' ? loginFields() : registerFields();
  }

  function loginFields() {
    return `
      <div>
        <label class="block text-xs font-semibold mb-1.5 text-slate-600 dark:text-slate-300">Correo o nombre de usuario</label>
        <input name="identifier" required autocomplete="username" placeholder="correo@ejemplo.com o mi_usuario" class="${FIELD_CLS}">
      </div>`;
  }

  function registerFields() {
    return `
      <div>
        <label class="block text-xs font-semibold mb-1.5 text-slate-600 dark:text-slate-300">Correo electrónico</label>
        <input name="email" type="email" required autocomplete="email" placeholder="tucorreo@ejemplo.com" class="${FIELD_CLS}">
      </div>
      <div>
        <label class="block text-xs font-semibold mb-1.5 text-slate-600 dark:text-slate-300">Nombre de usuario</label>
        <input name="username" required minlength="3" maxlength="20" autocomplete="username" placeholder="ej. saul123" class="${FIELD_CLS}">
        <p class="text-[11px] text-slate-400 mt-1">Único en la app: 3-20 caracteres, letras, números o _</p>
      </div>`;
  }

  tabLogin.addEventListener('click', () => setTab('login'));
  tabRegister.addEventListener('click', () => setTab('register'));
  setTab('login');

  root.querySelector('#auth-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target).entries());
    submit.disabled = true;
    submit.textContent = 'Un momento…';
    try {
      const payload = mode === 'login'
        ? { identifier: data.identifier.trim(), password: data.password }
        : { email: data.email, username: data.username, password: data.password };
      const res = await api.post(`/auth/${mode === 'login' ? 'login' : 'register'}`, payload);
      window.dispatchEvent(new CustomEvent('ms:session-start', { detail: res }));
    } catch (err) {
      toast(err.message, 'error');
      submit.disabled = false;
      submit.textContent = mode === 'login' ? 'Iniciar sesión' : 'Crear cuenta 🚀';
    }
  });
}
