import React from 'react';
import { WorkspaceProvider } from './context/WorkspaceContext';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginPage from './components/LoginPage/LoginPage';
import Dashboard from './pages/Dashboard';
import './App.css';

function ProtectedApp() {
  const { user, loading } = useAuth();
  if (loading) return <div style={{ padding: 30 }}>Cargando tu espacio de trabajo... 🌸</div>;
  if (!user) return <LoginPage />;
  return <WorkspaceProvider><Dashboard /></WorkspaceProvider>;
}

export default function App() {
  return <ThemeProvider><AuthProvider><ProtectedApp /></AuthProvider></ThemeProvider>;
}
