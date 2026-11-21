const test = require('node:test');
const assert = require('node:assert/strict');
const { projectQuery, assertProjectAccess } = require('../src/services/access');

test('el admin solo recibe proyectos de SU Kanban', () => {
  const request = { user: { id: 'alice' }, workspace: { id: 'espacio-A' }, workspaceRole: 'admin' };
  assert.deepEqual(projectQuery(request), { workspaceId: 'espacio-A' });
});
test('un member solamente ve proyectos asignados del mismo espacio', () => {
  const request = { user: { id: 'bob' }, workspace: { id: 'espacio-A' }, workspaceRole: 'member' };
  assert.deepEqual(projectQuery(request), { workspaceId: 'espacio-A', memberIds: 'bob' });
});
test('ser admin del Kanban A NO da acceso al Kanban B', () => {
  const request = { user: { id: 'alice' }, workspace: { id: 'espacio-A' }, workspaceRole: 'admin' };
  assert.throws(() => assertProjectAccess({ id: 'p', workspaceId: 'espacio-B', memberIds: ['alice'] }, request), /Proyecto no encontrado/);
});
test('un member sin asignación de proyecto no puede leerlo', () => {
  const request = { user: { id: 'bob' }, workspace: { id: 'espacio-A' }, workspaceRole: 'member' };
  assert.throws(() => assertProjectAccess({ id: 'p', workspaceId: 'espacio-A', memberIds: ['alice'] }, request), /No tienes acceso/);
});
test('el member asignado puede trabajar en su proyecto', () => {
  const request = { user: { id: 'bob' }, workspace: { id: 'espacio-A' }, workspaceRole: 'member' };
  const project = { id: 'p', workspaceId: 'espacio-A', memberIds: ['bob'] };
  assert.equal(assertProjectAccess(project, request), project);
});
