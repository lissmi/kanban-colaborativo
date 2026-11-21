const router = require('express').Router();
const { randomUUID } = require('node:crypto');
const Workspace = require('../models/Workspace');
const WorkspaceMember = require('../models/WorkspaceMember');
const { ensurePersonalWorkspace } = require('../services/workspaces');

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
    createdBy: space.createdBy,
  })).sort((a, b) => a.name.localeCompare(b.name, 'es'));
  res.json({ spaces: list });
});

// Cualquier cuenta de Google verificada puede administrar sus propios Kanban.
router.post('/', async (req, res) => {
  const name = req.body?.name;
  if (typeof name !== 'string' || !name.trim() || name.trim().length > 70) {
    return res.status(400).json({ error: 'El nombre del Kanban debe tener entre 1 y 70 caracteres' });
  }
  if (await Workspace.countDocuments({ createdBy: req.user.id }) >= 20) {
    return res.status(429).json({ error: 'Has alcanzado el límite de 20 Kanban propios' });
  }
  const space = await Workspace.create({
    id: randomUUID(), name: name.trim(), createdBy: req.user.id,
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
  res.status(201).json({ space: { id: space.id, name: space.name, role: 'admin', createdBy: req.user.id } });
});
module.exports = router;
