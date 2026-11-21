const router = require('express').Router();
const { randomUUID } = require('node:crypto');
const Member = require('../models/Member');
const Project = require('../models/Project');
const Task = require('../models/Task');
const WorkspaceMember = require('../models/WorkspaceMember');
const { memberInput } = require('../services/validation');
const { assert } = require('../utils/errors');
const { requireSpaceAdmin } = require('../middleware/workspace');
const { assertProjectAccess, projectQuery } = require('../services/access');
const { sendProjectInvitation } = require('../mail/gmailService');
const config = require('../config/env');
const { reserveInvitation } = require('../services/invitationQuota');

// Únicamente los usuarios de proyectos visibles dentro de este espacio.
router.get('/', async (req, res) => {
  const projects = await Project.find(projectQuery(req));
  const ids = [...new Set([req.user.id, ...projects.flatMap(p => p.memberIds)])];
  res.json(await Member.find({ id: { $in: ids } }).sort({ createdAt: 1 }));
});

// El administrador de ESTE espacio invita por correo a un proyecto concreto.
router.post('/', requireSpaceAdmin, async (req, res) => {
  const project = assertProjectAccess(await Project.findOne({ id: req.body?.projectId }), req);
  const data = memberInput(req.body);
  assert(Boolean(data.email), 400, 'El correo es obligatorio para invitar');
  let member = await Member.findOne({ email: data.email });
  const created = !member;
  if (!member) member = await Member.create({ id: randomUUID(), ...data });

  // Si la cuenta ya inició sesión con Google, el acceso queda activo inmediatamente.
  const now = new Date();
  let membership = await WorkspaceMember.findOne({ workspaceId: req.workspace.id, userId: member.id });
  if (!membership) {
    try {
      membership = await WorkspaceMember.create({
        workspaceId: req.workspace.id, userId: member.id,
        role: 'member', invitedBy: req.user.id,
        acceptedAt: member.googleSub ? now : null,
      });
    } catch (error) {
      if (error.code !== 11000) throw error;
      membership = await WorkspaceMember.findOne({ workspaceId: req.workspace.id, userId: member.id });
    }
  }
  project.memberIds.addToSet(member.id);
  await project.save();
  // Evitamos dobles envíos accidentales y restringimos el cupo diario.
  if (membership.invitationSentAt && Date.now() - membership.invitationSentAt.getTime() < 60000) {
    return res.status(429).json({ error: 'Esta invitación ya se envió hace menos de un minuto' });
  }
  await reserveInvitation(req.user.id);
  try {
    await sendProjectInvitation({
      to: member.email, name: member.name, projectName: project.name,
      senderName: req.user.name, url: `${config.frontendUrl}/?workspace=${encodeURIComponent(req.workspace.id)}`,
    });
    membership.invitationSentAt = new Date();
    await membership.save();
  } catch (error) {
    console.error('[Gmail]', error.message);
    return res.status(502).json({
      error: 'Participante agregado, pero Gmail no pudo enviar el correo. Puedes usar Reenviar.',
      emailSent: false,
    });
  }
  res.status(created ? 201 : 200).json({ member, project, emailSent: true });
});

// Reenvío para cualquier invitado del proyecto (también ya registrado en Google).
router.post('/:id/resend', requireSpaceAdmin, async (req, res) => {
  const project = assertProjectAccess(await Project.findOne({ id: req.body?.projectId }), req);
  const member = await Member.findOne({ id: req.params.id });
  assert(member, 404, 'Participante no encontrado');
  assert(project.memberIds.includes(member.id), 403, 'La persona no participa en este proyecto');
  assert(member.id !== req.user.id, 403, 'No puedes invitarte a ti mismo');
  const membership = await WorkspaceMember.findOne({ workspaceId: req.workspace.id, userId: member.id });
  assert(membership, 404, 'Invitación no encontrada');
  assert(Boolean(member.email), 400, 'La cuenta no tiene correo');
  if (membership.invitationSentAt && Date.now() - membership.invitationSentAt.getTime() < 60000) {
    return res.status(429).json({ error: 'Ya enviamos una invitación hace menos de un minuto' });
  }
  await reserveInvitation(req.user.id);
  try {
    await sendProjectInvitation({
      to: member.email, name: member.name, projectName: project.name,
      senderName: req.user.name, url: `${config.frontendUrl}/?workspace=${encodeURIComponent(req.workspace.id)}`,
    });
  } catch (error) {
    console.error('[Gmail reenvío]', error.message);
    return res.status(502).json({ error: 'Gmail no pudo reenviar la invitación', emailSent: false });
  }
  membership.invitationSentAt = new Date();
  await membership.save();
  res.json({ emailSent: true, recipient: member.email });
});

// Quitar de un proyecto NO elimina su cuenta ni otro Kanban administrado.
router.delete('/:id/projects/:projectId', requireSpaceAdmin, async (req, res) => {
  assert(req.params.id !== req.user.id, 400, 'No puedes quitar tu propia cuenta');
  const project = assertProjectAccess(await Project.findOne({ id: req.params.projectId }), req);
  assert(project.memberIds.includes(req.params.id), 404, 'Integrante no pertenece a este proyecto');
  const membership = await WorkspaceMember.findOne({ workspaceId: req.workspace.id, userId: req.params.id });
  assert(membership, 404, 'Participante no encontrado');
  assert(membership.role !== 'admin', 403, 'No puedes quitar al administrador del Kanban');
  project.memberIds = project.memberIds.filter(id => id !== req.params.id);
  await project.save();
  await Task.updateMany({ projectId: project.id, assigneeId: req.params.id }, { $set: { assigneeId: '' } });
  // Sin proyectos asignados ya no necesita una membresía en este espacio.
  const otherCount = await Project.countDocuments({
    workspaceId: req.workspace.id, memberIds: req.params.id,
  });
  if (!otherCount) await WorkspaceMember.deleteOne({ workspaceId: req.workspace.id, userId: req.params.id, role: 'member' });
  res.status(204).end();
});

// Se retiraron PATCH /members/:id y DELETE /members/:id: editaban cuentas globales.
// Cada persona modifica su perfil exclusivamente con PATCH /api/auth/me.
module.exports = router;
