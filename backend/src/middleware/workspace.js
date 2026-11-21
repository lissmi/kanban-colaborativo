const Workspace = require('../models/Workspace');
const WorkspaceMember = require('../models/WorkspaceMember');

// Una cabecera indica el Kanban, pero SOLAMENTE la BD decide si hay acceso.
async function requireWorkspace(req, res, next) {
  try {
    const workspaceId = req.get('x-workspace-id') || '';
    if (!workspaceId || workspaceId.length > 120) {
      return res.status(400).json({ error: 'Selecciona un Kanban válido' });
    }
    const membership = await WorkspaceMember.findOne({
      workspaceId, userId: req.user.id, acceptedAt: { $ne: null },
    });
    if (!membership) return res.status(403).json({ error: 'No tienes acceso a este Kanban' });
    const workspace = await Workspace.findOne({ id: workspaceId });
    if (!workspace) return res.status(404).json({ error: 'Kanban no encontrado' });
    req.workspace = workspace;
    req.workspaceRole = membership.role;
    next();
  } catch (error) { next(error); }
}

// Nunca confiar en un role enviado por React o en Member.role (campo anterior).
function requireSpaceAdmin(req, res, next) {
  if (req.workspaceRole !== 'admin') {
    return res.status(403).json({ error: 'Solo el administrador de este Kanban puede hacerlo' });
  }
  next();
}
module.exports = { requireWorkspace, requireSpaceAdmin };
