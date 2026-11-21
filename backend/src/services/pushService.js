// Las notificaciones se envían desde Express. React NUNCA recibe la clave VAPID privada.
const webpush = require('web-push');
const PushSubscription = require('../models/PushSubscription');
const NotificationPreference = require('../models/NotificationPreference');
const WorkspaceMember = require('../models/WorkspaceMember');
const config = require('../config/env');

const DEFAULT_PREFS = Object.freeze({
  reminderFrequency: '12h',
  statusChanges: true,
  priorityAlerts: true,
  timeZone: 'America/Santiago',
});

function pushConfigured() {
  return Boolean(config.vapidPublicKey && config.vapidPrivateKey && config.vapidSubject);
}

function configurePush() {
  if (!pushConfigured()) throw new Error('Configura VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY y MAIL_USER (o VAPID_SUBJECT) en el backend');
  webpush.setVapidDetails(config.vapidSubject, config.vapidPublicKey, config.vapidPrivateKey);
}

// Aceptamos únicamente los proveedores Push conocidos para reducir riesgos de SSRF.
function validateSubscription(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw Object.assign(new Error('Suscripción inválida'), { status: 400 });
  const endpoint = value.endpoint;
  if (typeof endpoint !== 'string' || endpoint.length > 2048) throw Object.assign(new Error('Endpoint Push inválido'), { status: 400 });
  let url;
  try { url = new URL(endpoint); } catch (_error) { throw Object.assign(new Error('URL Push inválida'), { status: 400 }); }
  const host = url.hostname.toLowerCase();
  const allowedHosts = [
    'fcm.googleapis.com', 'android.googleapis.com',
    'updates.push.services.mozilla.com', 'push.services.mozilla.com',
    'web.push.apple.com',
  ];
  const safe = allowedHosts.includes(host) || host.endsWith('.push.apple.com') || host.endsWith('.notify.windows.com');
  if (url.protocol !== 'https:' || url.username || url.password || url.port || !safe) {
    throw Object.assign(new Error('Proveedor de notificaciones Push no reconocido'), { status: 400 });
  }
  const keys = value.keys;
  if (!keys || typeof keys !== 'object' || !['p256dh', 'auth'].every(k =>
    typeof keys[k] === 'string' && /^[A-Za-z0-9_-]{12,512}$/.test(keys[k]))) {
    throw Object.assign(new Error('Claves de suscripción Push inválidas'), { status: 400 });
  }
  return { endpoint, keys: { p256dh: keys.p256dh, auth: keys.auth } };
}

function getPreferences(row) {
  return {
    reminderFrequency: row?.reminderFrequency || DEFAULT_PREFS.reminderFrequency,
    statusChanges: row?.statusChanges ?? DEFAULT_PREFS.statusChanges,
    priorityAlerts: row?.priorityAlerts ?? DEFAULT_PREFS.priorityAlerts,
    timeZone: row?.timeZone || DEFAULT_PREFS.timeZone,
  };
}

// Evita que una URL recibida desde un dato externo lleve al usuario fuera de nuestra PWA.
function appUrl(workspaceId = '', projectId = '') {
  const url = new URL(config.frontendUrl);
  if (workspaceId) url.searchParams.set('workspace', workspaceId);
  if (projectId) url.searchParams.set('project', projectId);
  return url.toString();
}

// Nunca mostramos títulos de tareas en endpoints de configuración ni en logs.
async function sendToUsers(userIds, notification, type = 'general', { workspaceId } = {}) {
  if (!pushConfigured()) return { devices: 0, delivered: 0 };
  configurePush();
  const unique = [...new Set(userIds.filter(Boolean))];
  if (!unique.length) return { devices: 0, delivered: 0 };

  let recipients = unique;
  if (workspaceId) {
    const memberships = await WorkspaceMember.find({
      workspaceId, userId: { $in: unique }, acceptedAt: { $ne: null },
    }).select('userId');
    recipients = memberships.map(link => link.userId);
  }
  if (!recipients.length) return { devices: 0, delivered: 0 };

  const [prefs, subscriptions] = await Promise.all([
    NotificationPreference.find({ userId: { $in: recipients } }),
    PushSubscription.find({ userId: { $in: recipients } }),
  ]);
  const prefMap = new Map(prefs.map(p => [p.userId, getPreferences(p)]));
  const eligible = subscriptions.filter(s => {
    const pref = prefMap.get(s.userId) || DEFAULT_PREFS;
    if (type === 'status') return pref.statusChanges;
    if (type === 'priority') return pref.priorityAlerts;
    if (type === 'reminder') return pref.reminderFrequency !== 'off';
    return true;
  });
  if (!eligible.length) return { devices: 0, delivered: 0 };

  const payload = JSON.stringify({
    title: String(notification.title || 'Kanban 🌸').slice(0, 90),
    body: String(notification.body || '').slice(0, 220),
    url: notification.url || config.frontendUrl,
    tag: String(notification.tag || 'kanban-notice').slice(0, 120),
  });
  let delivered = 0;
  await Promise.all(eligible.map(async subscription => {
    try {
      await webpush.sendNotification({ endpoint: subscription.endpoint, keys: subscription.keys }, payload, {
        TTL: type === 'reminder' ? 3600 : 86400,
        timeout: 4500,
        urgency: type === 'priority' ? 'high' : 'normal',
      });
      delivered++;
    } catch (error) {
      // 404/410 indican una instalación eliminada o un permiso revocado.
      if ([404, 410].includes(error.statusCode)) {
        await PushSubscription.deleteOne({ _id: subscription._id }).catch(() => {});
      } else {
        console.warn('[Push] No se pudo entregar una notificación:', error.statusCode || error.message);
      }
    }
  }));
  return { devices: eligible.length, delivered };
}

async function notifyTaskChanges({ before, task, project, actorId }) {
  const url = appUrl(project.workspaceId, project.id);
  const recipients = project.memberIds.filter(id => id !== actorId);
  if (before.status !== task.status) {
    const names = { todo: 'Por hacer', doing: 'En progreso', review: 'En revisión', done: 'Finalizado' };
    await sendToUsers(recipients, {
      title: '🔄 Cambio de estado · Kanban',
      body: `«${task.title}» → ${names[task.status] || task.status} · ${project.name}`,
      url, tag: `status-${task.id}-${task.status}`,
    }, 'status', { workspaceId: project.workspaceId });
  }
  if (task.status !== 'done' && task.priority === 'high' && task.assigneeId && task.assigneeId !== actorId &&
      (before.assigneeId !== task.assigneeId || before.priority !== 'high')) {
    await sendToUsers([task.assigneeId], {
      title: '🔴 Nueva tarea prioritaria',
      body: `Tienes «${task.title}» con prioridad alta en ${project.name}`,
      url, tag: `priority-${task.id}-${task.assigneeId}`,
    }, 'priority', { workspaceId: project.workspaceId });
  }
}

module.exports = { DEFAULT_PREFS, pushConfigured, validateSubscription, getPreferences, appUrl, sendToUsers, notifyTaskChanges };
