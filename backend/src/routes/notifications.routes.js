// Cuenta global: un mismo usuario recibe avisos de todos sus Kanban autorizados.
const router = require('express').Router();
const PushSubscription = require('../models/PushSubscription');
const NotificationPreference = require('../models/NotificationPreference');
const {
  pushConfigured, validateSubscription, getPreferences, sendToUsers,
} = require('../services/pushService');
const config = require('../config/env');

router.get('/config', async (req, res) => {
  const [stored, devices] = await Promise.all([
    NotificationPreference.findOne({ userId: req.user.id }),
    PushSubscription.countDocuments({ userId: req.user.id }),
  ]);
  res.set('Cache-Control', 'no-store');
  res.json({
    enabled: pushConfigured(),
    vapidPublicKey: pushConfigured() ? config.vapidPublicKey : '',
    devices,
    preferences: getPreferences(stored),
  });
});

router.patch('/preferences', async (req, res) => {
  const payload = req.body;
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return res.status(400).json({ error: 'Preferencias inválidas' });
  }
  const fields = Object.keys(payload);
  const allowed = ['reminderFrequency', 'statusChanges', 'priorityAlerts', 'timeZone'];
  if (!fields.length || fields.some(field => !allowed.includes(field))) {
    return res.status(400).json({ error: 'Opciones de notificación no permitidas' });
  }
  if (payload.reminderFrequency !== undefined && !['off', '6h', '12h', '24h'].includes(payload.reminderFrequency)) {
    return res.status(400).json({ error: 'Frecuencia inválida' });
  }
  for (const field of ['statusChanges', 'priorityAlerts']) {
    if (payload[field] !== undefined && typeof payload[field] !== 'boolean') {
      return res.status(400).json({ error: `${field} debe ser verdadero o falso` });
    }
  }
  if (payload.timeZone !== undefined) {
    if (typeof payload.timeZone !== 'string' || payload.timeZone.length > 80) {
      return res.status(400).json({ error: 'Zona horaria inválida' });
    }
    try { new Intl.DateTimeFormat('es-CL', { timeZone: payload.timeZone }); }
    catch (_error) { return res.status(400).json({ error: 'Zona horaria desconocida' }); }
  }
  const updated = await NotificationPreference.findOneAndUpdate(
    { userId: req.user.id },
    { $set: payload },
    { upsert: true, new: true, runValidators: true },
  );
  res.json({ preferences: getPreferences(updated) });
});

router.post('/subscription', async (req, res) => {
  if (!pushConfigured()) return res.status(503).json({ error: 'Web Push todavía no está configurado en Express' });
  const validated = validateSubscription(req.body?.subscription);
  const otherOwner = await PushSubscription.findOne({ endpoint: validated.endpoint });
  if (otherOwner && otherOwner.userId !== req.user.id) {
    return res.status(409).json({ error: 'Este navegador aún tiene avisos de otra cuenta. Desactívalos antes de continuar.' });
  }
  try {
    await PushSubscription.findOneAndUpdate(
      { endpoint: validated.endpoint, userId: req.user.id },
      { $set: { keys: validated.keys, userAgent: String(req.get('user-agent') || '').slice(0, 200) } },
      { upsert: true, new: true, runValidators: true },
    );
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ error: 'Este dispositivo está registrado por otra cuenta' });
    throw error;
  }
  await NotificationPreference.updateOne(
    { userId: req.user.id }, { $setOnInsert: getPreferences(null) }, { upsert: true },
  );
  res.status(201).json({ subscribed: true });
});

router.delete('/subscription', async (req, res) => {
  const endpoint = req.body?.endpoint;
  if (typeof endpoint !== 'string' || endpoint.length > 2048) return res.status(400).json({ error: 'Suscripción inválida' });
  await PushSubscription.deleteOne({ endpoint, userId: req.user.id });
  res.status(204).end();
});

router.post('/test', async (req, res) => {
  const devices = await PushSubscription.countDocuments({ userId: req.user.id });
  if (!devices) return res.status(409).json({ error: 'Primero activa los avisos en este dispositivo' });
  const result = await sendToUsers([req.user.id], {
    title: '🌸 ¡Kanban está conectado!',
    body: 'Las notificaciones Push funcionan. ¡A organizar esas tareas! ✨',
    tag: 'kanban-prueba',
  });
  res.json({ acceptedByPushService: result.delivered > 0, devices: result.delivered });
});

module.exports = router;
