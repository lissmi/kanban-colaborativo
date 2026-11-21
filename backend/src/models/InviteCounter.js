const mongoose = require('mongoose');

// Cupo diario persistente para evitar abusos del Gmail centralizado.
const InviteCounterSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  used: { type: Number, required: true, default: 0 },
  expiresAt: { type: Date, required: true },
}, { versionKey: false });
// Las cuotas antiguas caducan automáticamente después de unos días.
InviteCounterSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
module.exports = mongoose.models.InviteCounter || mongoose.model('InviteCounter', InviteCounterSchema);
