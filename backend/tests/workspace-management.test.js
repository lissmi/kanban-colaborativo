const test = require('node:test');
const assert = require('node:assert/strict');
const { validateWorkspaceName, assertConfirmedDeletion, assertWorkspaceDeletionAllowed } = require('../src/services/workspaceManagement');

test('renombrar: acepta solo name, elimina espacios exteriores y limita longitud', () => {
  assert.equal(validateWorkspaceName({ name: '  Equipo azul  ' }), 'Equipo azul');
  assert.throws(() => validateWorkspaceName({ name: ' ' }), /entre 1 y 70/);
  assert.throws(() => validateWorkspaceName({ name: 'x'.repeat(71) }), /entre 1 y 70/);
  assert.throws(() => validateWorkspaceName({ name: 'Equipo', createdBy: 'otro' }), /Solo puedes/);
  assert.throws(() => validateWorkspaceName({ isPersonal: false }), /Solo puedes/);
});

test('el borrado exige el nombre exacto del recurso', () => {
  assert.doesNotThrow(() => assertConfirmedDeletion('Equipo', 'Equipo'));
  assert.throws(() => assertConfirmedDeletion('equipo', 'Equipo'), /nombre exacto/);
});

test('solo el dueño admin puede borrar un Kanban NO personal', () => {
  const space = { name: 'Equipo', isPersonal: false, createdBy: 'ana' };
  const membership = { role: 'admin', acceptedAt: new Date() };
  assert.doesNotThrow(() => assertWorkspaceDeletionAllowed(space, membership, 'ana'));
  assert.throws(() => assertWorkspaceDeletionAllowed({ ...space, isPersonal: true }, membership, 'ana'), /personal/);
  assert.throws(() => assertWorkspaceDeletionAllowed(space, membership, 'otro'), /creó/);
  assert.throws(() => assertWorkspaceDeletionAllowed(space, { ...membership, role: 'member' }, 'ana'), /administrador/);
  assert.throws(() => assertWorkspaceDeletionAllowed(space, { ...membership, acceptedAt: null }, 'ana'), /administrador/);
});
