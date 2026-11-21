const test = require('node:test');
const assert = require('node:assert/strict');
const { taskInput, projectInput, memberInput } = require('../src/services/validation');

test('validación de proyecto y miembros', () => {
  const project = projectInput({ name: ' Mi proyecto ', memberIds: ['m1', 'm1'], color: 'mint' });
  assert.equal(project.name, 'Mi proyecto');
  assert.deepEqual(project.memberIds, ['m1']);
  assert.equal(memberInput({ name: 'Ana', email: 'ANA@EJEMPLO.CL' }).email, 'ana@ejemplo.cl');
});
test('creación de tarea válida', () => {
  const task = taskInput({ title: ' Implementar API ', status: 'doing', subtasks: [{ id: 's1', text: 'Esquema', done: false }] });
  assert.equal(task.title, 'Implementar API');
  assert.equal(task.status, 'doing');
});
test('rechaza estados y fechas incorrectos', () => {
  assert.throws(() => taskInput({ title: 'x', status: 'inventado' }), /Estado no es válido/);
  assert.throws(() => taskInput({ title: 'x', dueDate: '2026-02-30' }), /Fecha límite inválida/);
});
test('ignora cambios de campos no permitidos', () => {
  assert.deepEqual(taskInput({ id: 'hack', projectId: 'otro', title: 'Actualizado' }, true), { title: 'Actualizado' });
});
