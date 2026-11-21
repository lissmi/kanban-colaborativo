// React solo almacena un JWT corto en sessionStorage; la cookie HttpOnly queda en Express.
// Cerrar pestañas no elimina la cookie persistente, por lo que podemos renovar la sesión.
import axios from 'axios';

// En producción se usa el mismo dominio (/api); en desarrollo se respeta el .env actual.
// En Vercel este proyecto sirve React y Express bajo UN mismo dominio.
// Usar una URL http://... o de otro subdominio puede hacer que el navegador bloquee la cookie.
const API_URL = process.env.NODE_ENV === 'production'
  ? '/api'
  : (process.env.REACT_APP_API_URL || 'http://localhost:5000/api').replace(/\/$/, '');
const http = axios.create({ baseURL: API_URL, timeout: 15000, withCredentials: true });
const SESSION_KEY = 'kanban-session-token';
const SPACE_KEY = 'kanban-selected-space';
let inMemoryToken = '';
let inMemoryWorkspace = '';
let pendingRefresh = null; // Una sola renovación por pestaña para varias solicitudes simultáneas.

export const session = {
  get: () => {
    try { return window.sessionStorage.getItem(SESSION_KEY) || inMemoryToken; }
    catch (_error) { return inMemoryToken; }
  },
  set: token => {
    inMemoryToken = token;
    try { window.sessionStorage.setItem(SESSION_KEY, token); } catch (_error) {}
  },
  clear: () => {
    inMemoryToken = '';
    try { window.sessionStorage.removeItem(SESSION_KEY); } catch (_error) {}
  },
  // El Kanban elegido no otorga permisos: Express comprueba membresías en MongoDB.
  getWorkspace: () => {
    try { return inMemoryWorkspace || window.localStorage.getItem(SPACE_KEY) || ''; }
    catch (_error) { return inMemoryWorkspace; }
  },
  setWorkspace: id => {
    inMemoryWorkspace = id;
    try { window.localStorage.setItem(SPACE_KEY, id); } catch (_error) {}
  },
};

// Se añade el JWT únicamente a rutas autenticadas.
http.interceptors.request.use(config => {
  if (config.authenticated !== false) {
    const token = session.get();
    if (token) config.headers.Authorization = `Bearer ${token}`;
  } else {
    // Nunca enviar un JWT vencido a las rutas públicas de Google/refresh/logout.
    delete config.headers.Authorization;
  }
  const workspaceId = session.getWorkspace();
  if (workspaceId) config.headers['X-Workspace-Id'] = workspaceId;
  return config;
});

// Nunca almacenamos el secreto de la cookie en JavaScript ni en localStorage.
export function restorePersistentSession() {
  if (!pendingRefresh) {
    pendingRefresh = http.post('/auth/refresh', null, { authenticated: false })
      .then(response => {
        session.set(response.data.token);
        return response.data;
      })
      .finally(() => { pendingRefresh = null; });
  }
  return pendingRefresh;
}

function toFriendlyError(error) {
  const friendly = new Error(error.response?.data?.error ||
    (error.response ? `Error HTTP ${error.response.status}` : 'No se pudo conectar con el backend'));
  // Permite distinguir «no hay sesión» (401) de errores temporales o un 403 por configuración.
  friendly.status = error.response?.status || 0;
  return friendly;
}

export async function api(path, { method = 'GET', body, authenticated = true } = {}) {
  const config = { url: path, method, data: body, authenticated };
  try {
    const response = await http.request(config);
    return response.data ?? null;
  } catch (error) {
    // Cuando el JWT de 15 minutos vence, renovarlo mediante la cookie HttpOnly.
    // Los endpoints públicos de Google, refresh y logout no entran en este bucle.
    if (authenticated && error.response?.status === 401) {
      try {
        await restorePersistentSession();
        const retried = await http.request(config);
        return retried.data ?? null;
      } catch (retryError) {
        if (retryError.response?.status === 401) {
          session.clear();
          window.dispatchEvent(new Event('kanban-auth-expired'));
        }
        throw toFriendlyError(retryError);
      }
    }
    throw toFriendlyError(error);
  }
}

export default http;
