// Pruebas unitarias sin MongoDB en ejecución: calendario y validación de Push.
const test = require('node:test');
const assert = require('node:assert/strict');
const { reminderSlot } = require('../src/services/reminders');
const { validateSubscription } = require('../src/services/pushService');

const DAY = new Date('2026-11-20T12:00:00.000Z'); // 09:00 en Santiago (horario de verano).
const NIGHT = new Date('2026-11-21T00:00:00.000Z'); // 21:00 en Santiago, día 20.

test('12 horas: recordatorios a las 09:00 y 21:00 de Santiago', () => {
  const prefs = { reminderFrequency: '12h', timeZone: 'America/Santiago' };
  assert.equal(reminderSlot(prefs, DAY), '2026-11-20:9');
  assert.equal(reminderSlot(prefs, NIGHT), '2026-11-20:21');
  assert.equal(reminderSlot(prefs, new Date('2026-11-20T18:00:00.000Z')), null);
});

test('6 horas: solo horario diurno; desactivar y 24 horas', () => {
  assert.equal(reminderSlot({ reminderFrequency: '6h' }, new Date('2026-11-20T18:00:00Z')), '2026-11-20:15');
  assert.equal(reminderSlot({ reminderFrequency: '6h' }, NIGHT), '2026-11-20:21');
  assert.equal(reminderSlot({ reminderFrequency: '24h' }, NIGHT), null);
  assert.equal(reminderSlot({ reminderFrequency: 'off' }, DAY), null);
});

test('solo se aceptan servidores de notificación Push conocidos y HTTPS', () => {
  const keys = { p256dh: 'A'.repeat(80), auth: 'B'.repeat(24) };
  assert.equal(validateSubscription({ endpoint: 'https://fcm.googleapis.com/fcm/send/abc', keys }).keys.auth, keys.auth);
  assert.throws(() => validateSubscription({ endpoint: 'http://127.0.0.1/admin', keys }), /Proveedor/);
  assert.throws(() => validateSubscription({ endpoint: 'https://sospechoso.example/push', keys }), /Proveedor/);
  assert.throws(() => validateSubscription({ endpoint: 'https://web.push.apple.com/', keys: {} }), /Claves/);
});
