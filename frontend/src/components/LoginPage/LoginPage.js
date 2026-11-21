import React, { useEffect, useRef, useState } from 'react';
import { Flower2, LockKeyhole, Users, ShieldCheck } from 'lucide-react';
import ThemeToggle from '../ThemeToggle/ThemeToggle';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import './LoginPage.css';

export default function LoginPage() {
  // Aquí se dibuja el botón oficial de Google.
  const buttonRef = useRef(null);
  const { signInWithGoogle } = useAuth();
  const [message, setMessage] = useState('Preparando inicio de sesión con Google...');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let script = null;
    let onLoad = null;
    let onError = null;

    // El navegador solo recibe el Client ID público desde el backend.
    async function setup() {
      try {
        const { googleClientId } = await api('/auth/config', { authenticated: false });
        if (cancelled) return;
        if (!googleClientId) throw new Error('El backend no proporcionó el Client ID de Google');

        // El botón oficial de Google Identity Services devuelve un ID token al callback.
        function renderButton() {
          if (cancelled || !buttonRef.current || !window.google?.accounts?.id) return;
          window.google.accounts.id.initialize({
            client_id: googleClientId,
            callback: async ({ credential }) => {
              if (!credential || cancelled) return;
              setMessage('');
              setBusy(true);
              try {
                // Express verificará el token con Google y abrirá la sesión.
                await signInWithGoogle(credential);
              } catch (error) {
                if (!cancelled) setMessage(error.message);
              } finally {
                if (!cancelled) setBusy(false);
              }
            },
            auto_select: false,
          });
          buttonRef.current.replaceChildren();
          window.google.accounts.id.renderButton(buttonRef.current, {
            theme: 'outline', size: 'large', shape: 'pill', text: 'signin_with', width: 260,
          });
          setMessage('');
        }

        if (window.google?.accounts?.id) {
          renderButton();
          return;
        }

        // Cargamos la librería oficial solo si todavía no está disponible.
        script = document.querySelector('script[data-kanban-google]');
        if (!script) {
          script = document.createElement('script');
          script.src = 'https://accounts.google.com/gsi/client';
          script.async = true;
          script.dataset.kanbanGoogle = 'true';
          document.head.appendChild(script);
        }
        onLoad = renderButton;
        onError = () => { if (!cancelled) setMessage('No se pudo cargar Google. Comprueba la conexión a Internet.'); };
        script.addEventListener('load', onLoad);
        script.addEventListener('error', onError);
        // Previene una carrera si el script terminó de cargar durante la configuración.
        if (window.google?.accounts?.id) renderButton();
      } catch (error) {
        if (!cancelled) setMessage(error.message);
      }
    }

    setup();
    return () => {
      cancelled = true;
      if (script && onLoad) script.removeEventListener('load', onLoad);
      if (script && onError) script.removeEventListener('error', onError);
    };
  }, [signInWithGoogle]);

  return (
    <div className="kanban-login-shell">
      <div className="kanban-login-theme"><ThemeToggle /></div>
      <main className="kanban-login-card">
        <div className="kanban-login-flower"><Flower2 size={34} /></div>
        <div className="kanban-login-eyebrow">✨ TU ESPACIO PRODUCTIVO</div>
        <h1>Kanban <span>🌸</span></h1>
        <p>Un rincón bonito y organizado para trabajar en equipo, avanzar y celebrar cada logro.</p>
        <div className="kanban-login-features">
          <span><LockKeyhole size={15} /> Privado</span>
          <span><Users size={15} /> Colaborativo</span>
          <span><ShieldCheck size={15} /> Con Google</span>
        </div>
        <div className="kanban-google-button" ref={buttonRef} aria-label="Iniciar sesión con Google" />
        {busy && <div className="kanban-login-info">Verificando tu cuenta...</div>}
        {!busy && message && <p role="status" className="kanban-login-error">{message}</p>}
        <div className="kanban-login-footer">Solo cuentas invitadas pueden acceder 💜</div>
      </main>
    </div>
  );
}
