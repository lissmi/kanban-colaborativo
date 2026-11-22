const test = require('node:test');
const assert = require('node:assert/strict');
const { validateNote } = require('../src/services/noteValidation');
const { assertProjectAccess } = require('../src/services/access');

test('crea notas de texto plano con color permitido', () => {
  assert.deepEqual(validateNote({ projectId: 'p1', title: '  Revisión  ', content: '  Checklist  ', color: 'blue' }),
    { title: 'Revisión', content: 'Checklist', color: 'blue' });
});
test('rechaza alteraciones de proyecto y Kanban en ediciones', () => {
  assert.throws(() => validateNote({ workspaceId: 'otro', title: 'x', content: 'y' }), /campos no permitidos/);
  assert.throws(() => validateNote({ projectId: 'otro' }, true), /campos no permitidos/);
});
test('rechaza entradas vacías, colores desconocidos y exceso de longitud', () => {
  assert.throws(() => validateNote({ projectId: 'p', title: ' ', content: 'sí' }), /title/);
  assert.throws(() => validateNote({ projectId: 'p', title: 'Bien', content: 'sí', color: 'black' }), /Color/);
  assert.throws(() => validateNote({ projectId: 'p', title: 'Bien', content: 'x'.repeat(1401) }), /content/);
});
test('la verificación existente impide leer proyectos de otro Kanban', () => {
  const req = { workspace: { id: 'A' }, workspaceRole: 'member', user: { id: 'u1' } };
  assert.throws(() => assertProjectAccess({ workspaceId: 'B', memberIds: ['u1'] }, req), /Proyecto no encontrado/);
  assert.throws(() => assertProjectAccess({ workspaceId: 'A', memberIds: [] }, req), /No tienes acceso/);
});
