// Instalación PWA: capturamos el evento apenas se importa este módulo.
// PwaControls se importa al arrancar React, ANTES de iniciar sesión con Google.
// De este modo, no perdemos la oportunidad de instalar que Chrome ofrece al cargar.
let pendingPrompt = null;
const listeners = new Set();

function isInstalledNow() {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
}

// La API moderna puede no estar disponible; el evento clásico es el camino habitual.
export function canInstallDirectly() {
  if (typeof navigator === 'undefined' || isInstalledNow()) return false;
  return typeof navigator.install === 'function' || pendingPrompt !== null;
}

function emitState() {
  listeners.forEach(listener => listener());
}

export function onInstallAvailabilityChange(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', event => {
    // La app controla CUÁNDO aparece el cuadro de diálogo del navegador.
    event.preventDefault();
    pendingPrompt = event;
    emitState();
  });

  window.addEventListener('appinstalled', () => {
    // Cuando el sistema confirme la instalación, desaparece el botón.
    pendingPrompt = null;
    emitState();
  });

  // Detecta el modo de aplicación independiente cuando el navegador lo modifica.
  const standalone = window.matchMedia('(display-mode: standalone)');
  if (standalone.addEventListener) {
    standalone.addEventListener('change', emitState);
  }
}

export async function openNativeInstallDialog() {
  // Esta función DEBE invocarse directamente desde el onClick del usuario.
  if (isInstalledNow()) return 'installed';

  // Si el navegador implementa la nueva API, usar su diálogo seguro.
  if (typeof navigator.install === 'function') {
    // No hay ningún await previo: conservamos la activación real del clic.
    await navigator.install();
    emitState();
    return 'installed';
  }

  // beforeinstallprompt solo permite usar el evento UNA VEZ.
  if (!pendingPrompt) return 'unavailable';
  const event = pendingPrompt;
  pendingPrompt = null;
  emitState();

  // El navegador muestra ahora la ventana nativa de confirmación de instalación.
  await event.prompt();
  const decision = await event.userChoice;
  return decision?.outcome === 'accepted' ? 'accepted' : 'dismissed';
}
