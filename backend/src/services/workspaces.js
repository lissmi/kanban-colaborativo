const { randomUUID } = require('node:crypto');
const Workspace = require('../models/Workspace');
const WorkspaceMember = require('../models/WorkspaceMember');

// Preparar un espacio personal para cuentas nuevas y cuentas anteriores.
async function ensurePersonalWorkspace(user) {
  let space = await Workspace.findOne({ createdBy: user.id, isPersonal: true });
  if (!space) {
    const firstName = (user.name || 'Mi').trim().split(/\s+/)[0];
    try {
      space = await Workspace.create({
        id: randomUUID(), name: `Kanban de ${firstName}`.slice(0, 70),
        createdBy: user.id, isPersonal: true,
      });
    } catch (error) {
      // Una sesión simultánea puede haber creado el espacio antes.
      if (error.code !== 11000) throw error;
      space = await Workspace.findOne({ createdBy: user.id, isPersonal: true });
      if (!space) throw error;
    }
  }
  await WorkspaceMember.updateOne(
    { workspaceId: space.id, userId: user.id },
    { $setOnInsert: { role: 'admin', acceptedAt: new Date() } },
    { upsert: true },
  );
  return space;
}

// Correo validado por Google: activar invitaciones realizadas antes del registro.
async function activateInvitations(user) {
  await WorkspaceMember.updateMany(
    { userId: user.id, acceptedAt: null },
    { $set: { acceptedAt: new Date() } },
  );
}

module.exports = { ensurePersonalWorkspace, activateInvitations };
