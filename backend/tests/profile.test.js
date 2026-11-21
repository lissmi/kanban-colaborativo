// Pruebas mínimas del perfil, sin requerir MongoDB ni Google.
const test = require('node:test');
const assert = require('node:assert/strict');
const { profileInput } = require('../src/services/validation');

test('acepta nombre, color e ícono', () => {
  assert.deepEqual(profileInput({ name: ' Lucy ', color: 'pink', icon: '🐱' }),
    { name: 'Lucy', color: 'pink', icon: '🐱' });
});

test('permite volver a iniciales', () => {
  assert.deepEqual(profileInput({ icon: '' }), { icon: '' });
});

test('rechaza cambios de correo, roles y campos externos', () => {
  assert.throws(() => profileInput({ email: 'otro@ejemplo.com' }), /correo no se puede modificar/i);
  assert.throws(() => profileInput({ role: 'admin' }), /correo no se puede modificar/i);
  assert.throws(() => profileInput({ name: 'Lucy', googleSub: 'otro' }), /correo no se puede modificar/i);
});

test('rechaza colores, íconos o nombres no válidos', () => {
  assert.throws(() => profileInput({ icon: '<img>' }), /Ícono no es válido/);
  assert.throws(() => profileInput({ color: 'rojo' }), /Color no es válido/);
  assert.throws(() => profileInput({ name: '  ' }), /Nombre es obligatorio/);
});
