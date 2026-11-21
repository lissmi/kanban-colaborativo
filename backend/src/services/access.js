const { HttpError } = require('../utils/errors');

// Restringe toda lectura a un único espacio; los miembros ven proyectos asignados.
function projectQuery(req) {
  return req.workspaceRole === 'admin'
    ? { workspaceId: req.workspace.id }
    : { workspaceId: req.workspace.id, memberIds: req.user.id };
}

// Comprueba el workspace incluso cuando el ID de proyecto está alterado.
function assertProjectAccess(project, req) {
  if (!project || project.workspaceId !== req.workspace.id) {
    throw new HttpError(404, 'Proyecto no encontrado');
  }
  if (req.workspaceRole !== 'admin' && !project.memberIds.includes(req.user.id)) {
    throw new HttpError(403, 'No tienes acceso a este proyecto');
  }
  return project;
}
module.exports = { projectQuery, assertProjectAccess };
