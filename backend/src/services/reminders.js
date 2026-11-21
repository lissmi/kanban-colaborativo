// Resumen privado de tareas pendientes: no mezcla proyectos de Kanban ajenos.
const Member = require('../models/Member');
const Project = require('../models/Project');
const Task = require('../models/Task');
const WorkspaceMember = require('../models/WorkspaceMember');
const PushSubscription = require('../models/PushSubscription');
const NotificationPreference = require('../models/NotificationPreference');
const ReminderDispatch = require('../models/ReminderDispatch');
const { getPreferences, sendToUsers, appUrl } = require('./pushService');

const SLOTS = {
  '6h': [9, 15, 21], // Tres avisos diurnos como máximo; no interrumpir el descanso.
  '12h': [9, 21],   // Predeterminado: 09:00 y 21:00.
  '24h': [9],
  off: [],
};

function localClock(date, timeZone) {
  const fields = new Intl.DateTimeFormat('en-GB', {
    timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', hourCycle: 'h23',
  }).formatToParts(date);
  const data = Object.fromEntries(fields.map(part => [part.type, part.value]));
  return { date: `${data.year}-${data.month}-${data.day}`, hour: Number(data.hour) };
}

function reminderSlot(preferences, at = new Date()) {
  const config = getPreferences(preferences);
  const { date, hour } = localClock(at, config.timeZone);
  return (SLOTS[config.reminderFrequency] || []).includes(hour) ? `${date}:${hour}` : null;
}

async function sendReminders(at = new Date()) {
  const userIds = await PushSubscription.distinct('userId');
  if (!userIds.length) return { considered: 0, sentUsers: 0, deliveredDevices: 0 };
  const [storedPrefs, users] = await Promise.all([
    NotificationPreference.find({ userId: { $in: userIds } }),
    Member.find({ id: { $in: userIds }, googleSub: { $exists: true, $ne: '' } }).select('id'),
  ]);
  const validUserIds = new Set(users.map(u => u.id));
  const prefMap = new Map(storedPrefs.map(p => [p.userId, p]));
  let sentUsers = 0;
  let deliveredDevices = 0;

  for (const userId of userIds) {
    if (!validUserIds.has(userId)) continue;
    let slot;
    try { slot = reminderSlot(prefMap.get(userId), at); }
    catch (error) { console.warn('[Recordatorios] Zona horaria inválida:', error.message); continue; }
    if (!slot) continue;

    // Verificar membresías activas, proyectos asignados y tareas realmente pendientes.
    const [links, projects] = await Promise.all([
      WorkspaceMember.find({ userId, acceptedAt: { $ne: null } }).select('workspaceId'),
      Project.find({ memberIds: userId }).select('id workspaceId name'),
    ]);
    const allowedSpaces = new Set(links.map(link => link.workspaceId));
    const accessible = projects.filter(project => allowedSpaces.has(project.workspaceId));
    if (!accessible.length) continue;
    const tasks = await Task.find({
      projectId: { $in: accessible.map(project => project.id) },
      assigneeId: userId,
      status: { $ne: 'done' },
    }).select('id title priority dueDate projectId');
    if (!tasks.length) continue;

    // La clave incluye usuario, día local y hora: resiste ejecuciones duplicadas del cron.
    const key = `reminder:${userId}:${slot}`;
    try {
      await ReminderDispatch.create({ key, expiresAt: new Date(at.getTime() + 4 * 86400000) });
    } catch (error) {
      if (error.code === 11000) continue;
      throw error;
    }

    const priority = tasks.filter(task => task.priority === 'high');
    const today = slot.slice(0, 10);
    const overdue = tasks.filter(task => task.dueDate && task.dueDate < today);
    const dueToday = tasks.filter(task => task.dueDate === today);
    const projectById = new Map(accessible.map(p => [p.id, p]));
    const important = priority[0] || overdue[0] || tasks[0];
    const location = projectById.get(important.projectId);
    const parts = [`${tasks.length} tarea(s) pendientes`];
    if (priority.length) parts.push(`${priority.length} de prioridad alta`);
    if (overdue.length) parts.push(`${overdue.length} vencida(s)`);
    if (dueToday.length) parts.push(`${dueToday.length} para hoy`);
    const notification = {
      title: priority.length ? '🔴 Prioridades pendientes · Kanban' : '🌸 Tus tareas pendientes',
      body: `${parts.join(' · ')}. ¡Un pasito a la vez!`,
      url: appUrl(location?.workspaceId, location?.id),
      tag: `reminder-${slot}`,
    };
    try {
      const result = await sendToUsers([userId], notification, 'reminder');
      if (result.delivered) { sentUsers++; deliveredDevices += result.delivered; }
      else await ReminderDispatch.deleteOne({ key }); // Reintentar si no hubo entrega a ningún proveedor.
    } catch (error) {
      await ReminderDispatch.deleteOne({ key }).catch(() => {});
      console.warn('[Recordatorios] Falló el envío:', error.message);
    }
  }
  return { considered: userIds.length, sentUsers, deliveredDevices };
}

module.exports = { reminderSlot, sendReminders };
