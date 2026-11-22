// Validación aislada para la edición y eliminación controlada de Kanban.
const { HttpError } = require('../utils/errors');

function validateWorkspaceName(body) {
  // Solo aceptamos el campo name: no permitimos editar roles, dueño ni isPersonal.
  if (!body || typeof body !== 'object' || Array.isArray(body) ||
      Object.keys(body).length !== 1 || typeof body.name !== 'string') {
    throw new HttpError(400, 'Solo puedes modificar el nombre del Kanban');
  }
  const name = body.name.trim();
  if (!name || name.length > 70) {
    throw new HttpError(400, 'El nombre del Kanban debe tener entre 1 y 70 caracteres');
  }
  return name;
}

function assertConfirmedDeletion(confirmedName, actualName) {
  // El cliente debe enviar el nombre exacto: una confirmación visual no basta para la API.
  if (typeof confirmedName !== 'string' || confirmedName !== actualName) {
    throw new HttpError(400, 'Confirma la eliminación escribiendo el nombre exacto');
  }
}

function assertWorkspaceDeletionAllowed(space, membership, userId) {
  if (!space || !membership || membership.role !== 'admin' || !membership.acceptedAt) {
    throw new HttpError(403, 'Solo el administrador autorizado puede eliminar este Kanban');
  }
  // No se elimina el Kanban personal: sirve como punto de entrada a todos los espacios.
  if (space.isPersonal) {
    throw new HttpError(409, 'El Kanban personal no se puede eliminar; puedes cambiar su nombre');
  }
  // La eliminación total del espacio corresponde exclusivamente al dueño original.
  if (space.createdBy !== userId) {
    throw new HttpError(403, 'Solo quien creó el Kanban puede eliminarlo');
  }
}

module.exports = { validateWorkspaceName, assertConfirmedDeletion, assertWorkspaceDeletionAllowed };
