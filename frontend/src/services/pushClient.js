// Utilidades del navegador para Web Push: las claves VAPID privadas están en Express.
import { api } from './api';

// Base64url es el formato de la clave VAPID pública requerida por PushManager.
function urlBase64ToUint8Array(value) {
  const padding = '='.repeat((4 - value.length % 4) % 4);
  const base64 = (value + padding).replace(/-/g, '+').replace(/_/g, '/');
  return Uint8Array.from(window.atob(base64), char => char.charCodeAt(0));
}

export function pushSupported() {
  return window.isSecureContext && 'serviceWorker' in navigator &&
    'PushManager' in window && 'Notification' in window;
}

export function isInstalled() {
  return window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true;
}

export async function getBrowserSubscription() {
  if (!pushSupported()) return null;
  const registration = await navigator.serviceWorker.ready;
  return registration.pushManager.getSubscription();
}

export async function subscribePush(publicKey) {
  if (!pushSupported()) throw new Error('Este navegador no permite notificaciones Push o falta HTTPS');
  if (!publicKey) throw new Error('Falta configurar Web Push en el backend');
  // La solicitud del permiso se ejecuta desde un clic real del usuario.
  const permission = Notification.permission === 'granted'
    ? 'granted' : await Notification.requestPermission();
  if (permission !== 'granted') throw new Error('No se concedió permiso para mostrar notificaciones');

  const registration = await navigator.serviceWorker.ready;
  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });
  }
  // El servidor relaciona la suscripción con el usuario autenticado, nunca con role del cliente.
  try {
    await api('/notifications/subscription', { method: 'POST', body: { subscription: subscription.toJSON() } });
  } catch (error) {
    // No dejar un permiso local activo sin poder vincularlo con la cuenta.
    await subscription.unsubscribe().catch(() => {});
    throw error;
  }
  return subscription;
}

export async function unsubscribePush() {
  const subscription = await getBrowserSubscription();
  if (!subscription) return;
  try {
    await api('/notifications/subscription', { method: 'DELETE', body: { endpoint: subscription.endpoint } });
  } finally {
    // Revocamos también localmente aunque el backend no tenga conexión.
    await subscription.unsubscribe().catch(() => {});
  }
}

// Evita mostrar notificaciones privadas en un dispositivo compartido tras cerrar sesión.
export async function disconnectPushOnLogout() {
  try { await unsubscribePush(); }
  catch (_error) { /* El cierre de sesión siempre sigue, aunque la red falle. */ }
}
