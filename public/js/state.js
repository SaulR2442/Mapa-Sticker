// Estado global de la aplicación (single source of truth)
export const state = {
  user: null,
  mode: 'mine', // 'mine' | 'friend' | 'global'
  friendUsername: null,
  friends: [], // amigos aceptados
  incomingCount: 0,
  categories: new Set(['arte', 'marca', 'viajes', 'eventos', 'personal', 'sin-categoria']),
  tagQuery: '',
  showRoutes: true,
};

// Mini bus de eventos
const listeners = {};
export function on(name, fn) {
  (listeners[name] ||= []).push(fn);
}
export function emit(name, data) {
  (listeners[name] || []).forEach((fn) => fn(data));
}
