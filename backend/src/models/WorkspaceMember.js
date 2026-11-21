const mongoose = require('mongoose');

// Un usuario puede ser admin de un Kanban y member de otros.
const WorkspaceMemberSchema = new mongoose.Schema({
  workspaceId: { type: String, required: true, index: true },
  userId: { type: String, required: true, index: true },
  role: { type: String, required: true, enum: ['admin', 'member'], default: 'member' },
  invitedBy: { type: String, default: '' },
  // Una invitación pendiente se activa al validar el correo con Google.
  acceptedAt: { type: Date, default: null },
  invitationSentAt: { type: Date, default: null },
}, { timestamps: true, versionKey: false });

WorkspaceMemberSchema.index({ workspaceId: 1, userId: 1 }, { unique: true });
WorkspaceMemberSchema.set('toJSON', {
  transform: (_document, value) => { delete value._id; return value; },
});
module.exports = mongoose.models.WorkspaceMember || mongoose.model('WorkspaceMember', WorkspaceMemberSchema);
