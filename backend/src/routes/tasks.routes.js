const router = require('express').Router();
const { randomUUID } = require('node:crypto');
const Project = require('../models/Project');
const Task = require('../models/Task');
const { taskInput, STATUSES } = require('../services/validation');
const { assert } = require('../utils/errors');
const { assertProjectAccess, projectQuery } = require('../services/access');
const { notifyTaskChanges } = require('../services/pushService');

// El guardado de una tarea es independiente de los fallos de Push.
async function sendChangesSafely(before, task, project, actorId) {
  try { await notifyTaskChanges({ before, task, project, actorId }); }
  catch (error) { console.warn('[Push tarea]', error.message); }
}

function verifyAssignee(project, assigneeId) {
  if (assigneeId) assert(project.memberIds.includes(assigneeId), 400, 'Responsable no pertenece a este proyecto');
}
async function authorizedTask(taskId, req) {
  const task = await Task.findOne({ id: taskId });
  assert(task, 404, 'Tarea no encontrada');
  const project = assertProjectAccess(await Project.findOne({ id: task.projectId }), req);
  return { task, project };
}
router.get('/', async (req, res) => {
  const projects = await Project.find(projectQuery(req)).select('id');
  const ids = projects.map(p => p.id);
  const projectId = req.query.projectId ? String(req.query.projectId) : null;
  const allowed = projectId ? ids.filter(id => id === projectId) : ids;
  res.json(await Task.find({ projectId: { $in: allowed } }).sort({ createdAt: 1 }));
});
router.post('/', async (req, res) => {
  const project = assertProjectAccess(await Project.findOne({ id: req.body?.projectId }), req);
  const data = taskInput(req.body);
  verifyAssignee(project, data.assigneeId);
  const task = await Task.create({ id: randomUUID(), projectId: project.id, ...data });
  // Solo avisar inmediatamente cuando se asigna una nueva tarea de alta prioridad.
  await sendChangesSafely({ status: task.status, assigneeId: '', priority: 'low' }, task, project, req.user.id);
  res.status(201).json(task);
});
router.patch('/:id', async (req, res) => {
  const { task, project } = await authorizedTask(req.params.id, req);
  const data = taskInput(req.body, true);
  assert(Object.keys(data).length, 400, 'No se proporcionaron cambios');
  if (data.assigneeId !== undefined) verifyAssignee(project, data.assigneeId);
  const before = { status: task.status, priority: task.priority, assigneeId: task.assigneeId };
  Object.assign(task, data);
  await task.save();
  // Se notifican tanto cambios desde el formulario como los realizados por arrastrar.
  await sendChangesSafely(before, task, project, req.user.id);
  res.json(task);
});
router.patch('/:id/status', async (req, res) => {
  assert(STATUSES.includes(req.body?.status), 400, 'Estado no válido');
  const { task, project } = await authorizedTask(req.params.id, req);
  const before = { status: task.status, priority: task.priority, assigneeId: task.assigneeId };
  if (before.status === req.body.status) return res.json(task);
  task.status = req.body.status;
  await task.save();
  await sendChangesSafely(before, task, project, req.user.id);
  res.json(task);
});
router.delete('/:id', async (req, res) => {
  const { task } = await authorizedTask(req.params.id, req);
  await task.deleteOne();
  res.status(204).end();
});
module.exports = router;
