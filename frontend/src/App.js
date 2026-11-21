import React from 'react';
import { WorkspaceProvider } from './context/WorkspaceContext';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginPage from './components/LoginPage/LoginPage';
import Dashboard from './pages/Dashboard';
import './App.css';

function ProtectedApp() {
  const { user, loading, restoreError, retryRestore } = useAuth();
  if (loading) return <div style={{ padding: 30 }}>Verificando tu sesión... 🌸</div>;
  // Si el backend no responde, no confundirlo con un cierre de sesión del usuario.
  if (!user && restoreError) return (
    <main role="alert" style={{ maxWidth: 460, margin: '12vh auto', padding: 24, lineHeight: 1.6 }}>
      <h2>Tu sesión no se pudo verificar</h2>
      <p>{restoreError}</p>
      <button type="button" className="btn btn-primary" onClick={retryRestore}>Reintentar conexión</button>
    </main>
  );
  if (!user) return <LoginPage />;
  return <WorkspaceProvider><Dashboard /></WorkspaceProvider>;
}

export default function App() {
  return <ThemeProvider><AuthProvider><ProtectedApp /></AuthProvider></ThemeProvider>;
}
