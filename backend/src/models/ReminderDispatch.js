// Evita recordatorios duplicados si el programador llama dos veces a la API.
const mongoose = require('mongoose');

const ReminderDispatchSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  expiresAt: { type: Date, required: true },
}, { versionKey: false });
ReminderDispatchSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.models.ReminderDispatch || mongoose.model('ReminderDispatch', ReminderDispatchSchema);
