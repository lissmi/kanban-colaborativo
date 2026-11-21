import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
// Importamos los estilos globales de los temas claro y oscuro.
import './styles/context/theme.css';

// Importamos las correcciones de colores y navegación.
import './styles/context/kanban-fixes.css';

// Mantiene la vista del teléfono dentro de su pantalla y organiza sus controles.
import './styles/context/mobile-responsive.css';

// El modo claro amarillo sólido se carga al final para evitar los fondos blancos originales.
import './styles/context/light-comfort.css';

// Monta el componente principal de React dentro del elemento #root de public/index.html.
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<React.StrictMode><App /></React.StrictMode>);

// Añadimos el manifest aunque el index.html antiguo no lo incluya.
// Así evitamos reemplazar tus metadatos y descripción existentes del sitio.
// Si React ya usaba un manifest, apuntamos ese mismo elemento al nuestro.
let manifestLink = document.querySelector('link[rel="manifest"]');
if (!manifestLink) {
  manifestLink = document.createElement('link');
  manifestLink.rel = 'manifest';
  document.head.appendChild(manifestLink);
}
manifestLink.href = '/manifest.json';

// iOS utiliza estos metadatos para mostrar la PWA en modo aplicación.
for (const [name, content] of [
  ['apple-mobile-web-app-capable', 'yes'],
  ['apple-mobile-web-app-status-bar-style', 'black-translucent'],
  ['apple-mobile-web-app-title', 'Kanban 🌸'],
]) {
  if (!document.querySelector(`meta[name="${name}"]`)) {
    const meta = document.createElement('meta');
    meta.name = name;
    meta.content = content;
    document.head.appendChild(meta);
  }
}
if (!document.querySelector('link[rel="apple-touch-icon"]')) {
  const icon = document.createElement('link');
  icon.rel = 'apple-touch-icon';
  icon.href = '/icon-192.png';
  document.head.appendChild(icon);
}

// El Service Worker NO guarda respuestas privadas ni tokens de sesión en caché.
if ('serviceWorker' in navigator && window.isSecureContext) {
  const registerWorker = () => navigator.serviceWorker.register('/sw.js').catch(error => {
    console.warn('No se pudo instalar el Service Worker:', error.message);
  });
  if (document.readyState === 'complete') registerWorker();
  else window.addEventListener('load', registerWorker, { once: true });
}
