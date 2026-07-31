// Cliente HTTP: fetch + JWT en localStorage
const TOKEN_KEY = 'ms_token';

let token = localStorage.getItem(TOKEN_KEY) || null;

export function getToken() {
  return token;
}
export function setToken(t) {
  token = t || null;
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

async function request(method, url, body) {
  const opts = { method, headers: {} };
  if (token) opts.headers.Authorization = `Bearer ${token}`;

  if (body instanceof FormData) {
    opts.body = body;
  } else if (body !== undefined) {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  }

  const res = await fetch('/api' + url, opts);

  let data = null;
  try { data = await res.json(); } catch { /* sin JSON */ }

  if (res.status === 401 && !url.startsWith('/auth')) {
    window.dispatchEvent(new CustomEvent('ms:logout'));
  }
  if (!res.ok) {
    const err = new Error((data && data.error) || `Error ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return data;
}

export const api = {
  get: (u) => request('GET', u),
  post: (u, b) => request('POST', u, b),
  put: (u, b) => request('PUT', u, b),
  del: (u) => request('DELETE', u),
};
