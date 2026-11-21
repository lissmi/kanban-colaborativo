// Una sesión persistente representa UN navegador/dispositivo, no un Kanban.
// Solo guardamos SHA-256 del secreto aleatorio, nunca su valor en texto plano.
const mongoose = require('mongoose');

const PersistentSessionSchema = new mongoose.Schema({
  tokenHash: { type: String, required: true, unique: true, index: true },
  userId: { type: String, required: true, index: true },
  expiresAt: { type: Date, required: true },
}, { timestamps: true, versionKey: false });

// MongoDB elimina las sesiones vencidas de forma asíncrona (además se valida al leerlas).
PersistentSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.models.PersistentSession ||
  mongoose.model('PersistentSession', PersistentSessionSchema);
