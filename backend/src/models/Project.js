const mongoose = require('mongoose');

const ProjectSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, index: true },
  // El espacio siempre lo determina el servidor, nunca el formulario de React.
  workspaceId: { type: String, required: true, index: true },
  name: { type: String, required: true, maxlength: 65 },
  description: { type: String, default: '', maxlength: 220 },
  icon: { type: String, default: '🌷' },
  color: { type: String, enum: ['lilac', 'peach', 'mint', 'blue', 'pink'], default: 'lilac' },
  memberIds: { type: [String], default: [] },
}, { timestamps: true, versionKey: false });

ProjectSchema.index({ workspaceId: 1, createdAt: 1 });
ProjectSchema.set('toJSON', { transform: (_, result) => { delete result._id; return result; } });
module.exports = mongoose.models.Project || mongoose.model('Project', ProjectSchema);
