import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api, session, restorePersistentSession } from '../services/api';
import { disconnectPushOnLogout } from '../services/pushClient';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [restoreError, setRestoreError] = useState('');

  // Se puede ejecutar al iniciar, al recuperar Internet o al pulsar «Reintentar».
  const retryRestore = useCallback(async () => {
    setLoading(true);
    setRestoreError('');
    try {
      // Primero validar el JWT corto existente; sin él, recuperar desde cookie HttpOnly.
      const result = session.get()
        ? await api('/auth/me')
        : await restorePersistentSession();
      setUser(result.user);
    } catch (error) {
      const status = error.status || error.response?.status || 0;
      if (status === 401) {
        // Solo un 401 del backend significa que no hay una sesión válida.
        session.clear();
        setUser(null);
      } else {
        // Fallos 403/500/red NO significan que el usuario haya pulsado «Salir».
        // La cookie permanece intacta y puede recuperarse con un nuevo intento.
        setRestoreError(status === 403
          ? 'No se autorizó la renovación de la sesión. Revisa el origen HTTPS en Vercel.'
          : 'No se pudo verificar la sesión por ahora. Comprueba tu conexión e inténtalo otra vez.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Si vuelve Internet, reintenta automáticamente sin pedir Google de nuevo.
    const onOnline = () => { retryRestore(); };
    retryRestore();
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, [retryRestore]);

  // Si la API devuelve 401, cerramos automáticamente la sesión visual.
  useEffect(() => {
    function expired() { setUser(null); }
    window.addEventListener('kanban-auth-expired', expired);
    return () => window.removeEventListener('kanban-auth-expired', expired);
  }, []);

  // Función estable: evita inicializar nuevamente el botón de Google al actualizar React.
  const signInWithGoogle = useCallback(async (credential) => {
    const result = await api('/auth/google', { method: 'POST', body: { credential }, authenticated: false });
    session.set(result.token);
    setRestoreError('');
    setUser(result.user);
  }, []);

  // Actualiza solo los campos editables del usuario conectado.
  const updateProfile = useCallback(async ({ name, color, icon }) => {
    const result = await api('/auth/me', { method: 'PATCH', body: { name, color, icon } });
    setUser(result.user);
    return result.user;
  }, []);

  async function logout() {
    // Al pulsar «Salir», se desactiva Push en este dispositivo por privacidad.
    // Cerrar la pestaña o la PWA NO ejecuta esta función y conserva el Push.
    await disconnectPushOnLogout().catch(() => {});
    try {
      // Revocar el identificador persistente también en MongoDB.
      await api('/auth/logout', { method: 'POST', authenticated: false });
    } catch (_error) {
      // No fingir un cierre completo: la cookie HttpOnly solo puede revocarla el servidor.
      window.alert('No se pudo cerrar completamente la sesión. Revisa tu conexión e inténtalo de nuevo.');
      return;
    }
    session.clear();
    setRestoreError('');
    setUser(null);
    if (window.google?.accounts?.id) window.google.accounts.id.disableAutoSelect();
  }

  return <AuthContext.Provider value={{ user, loading, restoreError, retryRestore, signInWithGoogle, updateProfile, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth requiere AuthProvider');
  return value;
}
