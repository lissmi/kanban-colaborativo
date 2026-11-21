const mongoose = require('mongoose');

// Identidad global de Google, NO contiene permisos administrativos globales.
const MemberSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true, maxlength: 70 },
  email: { type: String, default: '', lowercase: true, trim: true, maxlength: 150 },
  color: { type: String, enum: ['lilac', 'peach', 'mint', 'blue', 'pink'], default: 'mint' },
  icon: { type: String, default: '', maxlength: 12 },
  googleSub: { type: String, unique: true, sparse: true },
  // 'role' persiste solamente para leer datos anteriores; NO se utiliza para permisos.
  role: { type: String, enum: ['admin', 'member'], default: 'member' },
  joinedAt: { type: Date },
  invitationSentAt: { type: Date },
}, { timestamps: true, versionKey: false });

MemberSchema.index({ email: 1 });
MemberSchema.set('toJSON', {
  transform: (_, result) => { delete result._id; delete result.googleSub; delete result.role; return result; },
});
module.exports = mongoose.models.Member || mongoose.model('Member', MemberSchema);
