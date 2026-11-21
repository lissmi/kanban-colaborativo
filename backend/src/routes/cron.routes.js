// El programador externo llama a esta ruta con un secreto del backend, nunca el JWT del usuario.
const router = require('express').Router();
const { timingSafeEqual } = require('node:crypto');
const config = require('../config/env');
const { sendReminders } = require('../services/reminders');

function allowed(req) {
  const expected = config.cronSecret;
  const bearer = String(req.get('authorization') || '');
  const given = req.get('x-cron-secret') || (bearer.startsWith('Bearer ') ? bearer.slice(7) : '');
  if (!expected || expected.length < 32 || !given || given.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(given), Buffer.from(expected));
}

router.get('/reminders', async (req, res) => {
  if (!allowed(req)) return res.status(401).json({ error: 'Programador no autorizado' });
  res.set('Cache-Control', 'no-store');
  try {
    const result = await sendReminders();
    res.json({ ok: true, ...result });
  } catch (error) {
    console.error('[Cron recordatorios]', error.message);
    res.status(500).json({ error: 'No se pudo ejecutar el recordatorio' });
  }
});

module.exports = router;
