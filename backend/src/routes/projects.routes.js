const router = require('express').Router();
const { randomUUID } = require('node:crypto');
const Project = require('../models/Project');
const Member = require('../models/Member');
const WorkspaceMember = require('../models/WorkspaceMember');
const Task = require('../models/Task');
const ProjectNote = require('../models/ProjectNote');
const { projectInput } = require('../services/validation');
const { assert } = require('../utils/errors');
const { requireSpaceAdmin } = require('../middleware/workspace');
const { projectQuery, assertProjectAccess } = require('../services/access');
const { assertConfirmedDeletion } = require('../services/workspaceManagement');

// Un proyecto solo puede incorporar cuentas que pertenezcan al mismo Kanban.
async function verifyMembers(memberIds, req) {
  if (!memberIds.length) return;
  const count = await WorkspaceMember.countDocuments({
    workspaceId: req.workspace.id, userId: { $in: memberIds },
  });
  assert(count === memberIds.length, 400, 'Algún participante no pertenece a este Kanban');
  const users = await Member.countDocuments({ id: { $in: memberIds } });
  assert(users === memberIds.length, 400, 'Hay un participante inexistente');
}

router.get('/', async (req, res) => res.json(await Project.find(projectQuery(req)).sort({ createdAt: 1 })));
router.post('/', requireSpaceAdmin, async (req, res) => {
  const data = projectInput(req.body);
  data.memberIds = [...new Set([req.user.id, ...data.memberIds])];
  await verifyMembers(data.memberIds, req);
  const project = await Project.create({
    id: randomUUID(), workspaceId: req.workspace.id, ...data,
  });
  res.status(201).json(project);
});
router.patch('/:id', requireSpaceAdmin, async (req, res) => {
  const project = assertProjectAccess(await Project.findOne({ id: req.params.id }), req);
  const data = projectInput(req.body, true);
  assert(Object.keys(data).length, 400, 'No se proporcionaron cambios');
  if (data.memberIds) {
    data.memberIds = [...new Set([req.user.id, ...data.memberIds])];
    await verifyMembers(data.memberIds, req);
  }
  Object.assign(project, data);
  await project.save();
  // Si se retiró a alguien del proyecto, sus tareas no deben quedar asignadas a esa cuenta.
  if (data.memberIds) {
    await Task.updateMany({ projectId: project.id, assigneeId: { $nin: data.memberIds } },
      { $set: { assigneeId: '' } });
  }
  res.json(project);
});
router.delete('/:id', requireSpaceAdmin, async (req, res) => {
  const project = assertProjectAccess(await Project.findOne({ id: req.params.id }), req);
  assertConfirmedDeletion(req.body?.confirmName, project.name);
  await Task.deleteMany({ projectId: project.id });
  // Borrar también las notas del proyecto, sin afectar las de otros proyectos.
  await ProjectNote.deleteMany({ projectId: project.id, workspaceId: req.workspace.id });
  await project.deleteOne();
  res.status(204).end();
});
module.exports = router;
