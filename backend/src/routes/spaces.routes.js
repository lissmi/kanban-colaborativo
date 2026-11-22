const router = require('express').Router();
const { randomUUID } = require('node:crypto');
const Workspace = require('../models/Workspace');
const WorkspaceMember = require('../models/WorkspaceMember');
const { ensurePersonalWorkspace } = require('../services/workspaces');
const Project = require('../models/Project');
const Task = require('../models/Task');
const ProjectNote = require('../models/ProjectNote');
const { HttpError } = require('../utils/errors');
const { validateWorkspaceName, assertConfirmedDeletion, assertWorkspaceDeletionAllowed } = require('../services/workspaceManagement');

// Lista privada: una cuenta ve únicamente Kanban de los que es integrante.
router.get('/', async (req, res) => {
  // También habilita sesiones anteriores a la actualización, sin relogin.
  await ensurePersonalWorkspace(req.user);
  const links = await WorkspaceMember.find({
    userId: req.user.id, acceptedAt: { $ne: null },
  });
  const spaces = await Workspace.find({ id: { $in: links.map(link => link.workspaceId) } });
  const linkMap = new Map(links.map(link => [link.workspaceId, link]));
  const list = spaces.map(space => ({
    id: space.id, name: space.name,
    role: linkMap.get(space.id).role,
    createdBy: space.createdBy, isPersonal: space.isPersonal,
  })).sort((a, b) => a.name.localeCompare(b.name, 'es'));
  res.json({ spaces: list });
});

// Cualquier cuenta de Google verificada puede administrar sus propios Kanban.
router.post('/', async (req, res) => {
  const name = validateWorkspaceName(req.body);
  if (await Workspace.countDocuments({ createdBy: req.user.id }) >= 20) {
    return res.status(429).json({ error: 'Has alcanzado el límite de 20 Kanban propios' });
  }
  const space = await Workspace.create({
    id: randomUUID(), name, createdBy: req.user.id,
  });
  try {
    await WorkspaceMember.create({
      workspaceId: space.id, userId: req.user.id,
      role: 'admin', acceptedAt: new Date(),
    });
  } catch (error) {
    await Workspace.deleteOne({ id: space.id });
    throw error;
  }
  res.status(201).json({ space: { id: space.id, name: space.name, role: 'admin', createdBy: req.user.id, isPersonal: false } });
});
// Editar Kanban: el administrador de ESTE espacio puede cambiar únicamente su nombre.
router.patch('/:id', async (req, res) => {
  const space = await Workspace.findOne({ id: req.params.id });
  if (!space) throw new HttpError(404, 'Kanban no encontrado');
  const membership = await WorkspaceMember.findOne({
    workspaceId: space.id, userId: req.user.id, role: 'admin', acceptedAt: { $ne: null },
  });
  if (!membership) throw new HttpError(403, 'Solo el administrador de este Kanban puede editarlo');
  space.name = validateWorkspaceName(req.body);
  await space.save();
  res.json({ space: { id: space.id, name: space.name, role: 'admin', createdBy: space.createdBy, isPersonal: space.isPersonal } });
});

// Eliminar el Kanban completo: no se puede borrar el personal ni el espacio de otro creador.
router.delete('/:id', async (req, res) => {
  const space = await Workspace.findOne({ id: req.params.id });
  if (!space) throw new HttpError(404, 'Kanban no encontrado');
  const membership = await WorkspaceMember.findOne({
    workspaceId: space.id, userId: req.user.id, role: 'admin', acceptedAt: { $ne: null },
  });
  assertWorkspaceDeletionAllowed(space, membership, req.user.id);
  assertConfirmedDeletion(req.body?.confirmName, space.name);

  // Orden cuidadoso y todos los filtros limitados al espacio; jamás borrar usuarios globales.
  const projectIds = (await Project.find({ workspaceId: space.id }).select('id')).map(project => project.id);
  // Eliminar registros dependientes antes de borrar el espacio (MongoDB no aplica cascadas).
  await Task.deleteMany({ projectId: { $in: projectIds } });
  await ProjectNote.deleteMany({ workspaceId: space.id });
  await Project.deleteMany({ workspaceId: space.id });
  await WorkspaceMember.deleteMany({ workspaceId: space.id });
  await Workspace.deleteOne({ id: space.id, createdBy: req.user.id, isPersonal: false });
  res.status(204).end();
});

module.exports = router;
