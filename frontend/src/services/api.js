// Axios conecta React con Express. El único dato de configuración del frontend
// continúa siendo REACT_APP_API_URL: los secretos OAuth/Gmail están en backend.
import axios from 'axios';
// En local se respeta REACT_APP_API_URL=http://localhost:5000/api.
// En Vercel, frontend y backend comparten dominio: usamos /api sin otro secreto.
const defaultApiUrl = process.env.NODE_ENV === 'production' ? '/api' : 'http://localhost:5000/api';
const API_URL = (process.env.REACT_APP_API_URL || defaultApiUrl).replace(/\/$/, '');
const http = axios.create({ baseURL: API_URL, timeout: 15000 });
const SESSION_KEY = 'kanban-session-token';
const SPACE_KEY = 'kanban-selected-space';
let inMemoryWorkspace = ''; // Fallback cuando localStorage está bloqueado.

export const session = {
  get: () => window.sessionStorage.getItem(SESSION_KEY),
  set: token => window.sessionStorage.setItem(SESSION_KEY, token),
  clear: () => window.sessionStorage.removeItem(SESSION_KEY),
  // La preferencia de espacio no otorga permisos: Express consulta MongoDB.
  getWorkspace: () => {
    try { return inMemoryWorkspace || window.localStorage.getItem(SPACE_KEY) || ''; }
    catch (_error) { return inMemoryWorkspace; }
  },
  setWorkspace: id => {
    inMemoryWorkspace = id;
    try { window.localStorage.setItem(SPACE_KEY, id); } catch (_error) {}
  },
};

http.interceptors.request.use(config => {
  const token = session.get();
  if (token && config.authenticated !== false) config.headers.Authorization = `Bearer ${token}`;
  const workspaceId = session.getWorkspace();
  if (workspaceId) config.headers['X-Workspace-Id'] = workspaceId;
  return config;
});

export async function api(path, { method = 'GET', body, authenticated = true } = {}) {
  try {
    const response = await http.request({ url: path, method, data: body, authenticated });
    return response.data ?? null;
  } catch (error) {
    if (error.response?.status === 401 && authenticated) {
      session.clear();
      window.dispatchEvent(new Event('kanban-auth-expired'));
    }
    throw new Error(error.response?.data?.error ||
      (error.response ? `Error HTTP ${error.response.status}` : 'No se pudo conectar con el backend'));
  }
}
export default http;
