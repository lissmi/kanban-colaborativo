// Notas fijadas del proyecto: nunca se contabilizan como tareas.
const mongoose = require('mongoose');

const ProjectNoteSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, index: true },
  // El servidor obtiene ambos IDs del proyecto autorizado, no del cliente.
  workspaceId: { type: String, required: true, index: true },
  projectId: { type: String, required: true, index: true },
  authorId: { type: String, required: true },
  title: { type: String, required: true, maxlength: 70 },
  content: { type: String, required: true, maxlength: 1400 },
  color: { type: String, enum: ['yellow', 'lilac', 'blue', 'pink', 'mint'], default: 'yellow' },
}, { timestamps: true, versionKey: false });

// Permite cargar las notas de un proyecto con una consulta eficiente.
ProjectNoteSchema.index({ projectId: 1, createdAt: -1 });
ProjectNoteSchema.set('toJSON', {
  transform: (_document, value) => { delete value._id; return value; },
});
module.exports = mongoose.models.ProjectNote || mongoose.model('ProjectNote', ProjectNoteSchema);
