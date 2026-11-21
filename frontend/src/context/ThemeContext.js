import React, { createContext, useContext, useLayoutEffect, useMemo, useState } from 'react';

// Esta clave solo guarda la preferencia visual; no modifica las tareas del Kanban.
const STORAGE_KEY = 'kanban-colaborativo-theme';

// El contexto permite compartir el tema sin pasar propiedades entre componentes.
const ThemeContext = createContext(null);

// Intentamos recuperar la preferencia guardada; la primera visita comienza en modo oscuro.
function readInitialTheme() {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === 'light' ? 'light' : 'dark';
  } catch (error) {
    return 'dark'; // La app sigue funcionando aunque el navegador bloquee localStorage.
  }
}

// Proveedor global: controla los colores de toda la aplicación.
export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(readInitialTheme);

  // Aplicamos el tema al elemento HTML antes del repintado visual de React.
  useLayoutEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.style.colorScheme = theme;
    try {
      window.localStorage.setItem(STORAGE_KEY, theme);
    } catch (error) {
      // Si el almacenamiento está bloqueado, el interruptor continúa funcionando.
    }
  }, [theme]);

  // Usamos una actualización funcional para no depender del valor anterior del render.
  const toggleTheme = () => setTheme(current => current === 'dark' ? 'light' : 'dark');

  // Compartimos solo lo necesario: tema activo, cambio manual y función de alternancia.
  const value = useMemo(() => ({ theme, setTheme, toggleTheme }), [theme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

// Hook para acceder al tema desde cualquier componente descendiente.
export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme debe utilizarse dentro de ThemeProvider');
  return context;
}
