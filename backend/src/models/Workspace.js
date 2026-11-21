const mongoose = require('mongoose');

// Cada Kanban mantiene aislados sus proyectos, tareas e integrantes.
const WorkspaceSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true, trim: true, maxlength: 70 },
  createdBy: { type: String, required: true, index: true },
  // El primer Kanban se crea automáticamente; los adicionales son independientes.
  isPersonal: { type: Boolean, default: false },
}, { timestamps: true, versionKey: false });

// Impide crear dos Kanban personales por error tras dos sesiones simultáneas.
WorkspaceSchema.index(
  { createdBy: 1, isPersonal: 1 },
  { unique: true, partialFilterExpression: { isPersonal: true } },
);
WorkspaceSchema.set('toJSON', {
  transform: (_document, value) => { delete value._id; return value; },
});
module.exports = mongoose.models.Workspace || mongoose.model('Workspace', WorkspaceSchema);
