import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api, session } from '../services/api';
import { disconnectPushOnLogout } from '../services/pushClient';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Recuperamos la sesión del navegador y pedimos al backend que la valide.
  useEffect(() => {
    let active = true;
    async function restore() {
      if (session.get()) {
        try {
          const result = await api('/auth/me');
          if (active) setUser(result.user);
        } catch (_error) {
          session.clear();
        }
      }
      if (active) setLoading(false);
    }
    restore();
    return () => { active = false; };
  }, []);

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
    setUser(result.user);
  }, []);

  // Actualiza solo los campos editables del usuario conectado.
  const updateProfile = useCallback(async ({ name, color, icon }) => {
    const result = await api('/auth/me', { method: 'PATCH', body: { name, color, icon } });
    setUser(result.user);
    return result.user;
  }, []);

  async function logout() {
    // Desactivar este dispositivo antes de cerrar sesión evita mostrar datos de otro usuario.
    await disconnectPushOnLogout();
    session.clear();
    setUser(null);
    if (window.google?.accounts?.id) window.google.accounts.id.disableAutoSelect();
  }

  return <AuthContext.Provider value={{ user, loading, signInWithGoogle, updateProfile, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth requiere AuthProvider');
  return value;
}
