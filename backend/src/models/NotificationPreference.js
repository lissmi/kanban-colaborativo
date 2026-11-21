// Los ajustes de notificación son globales a la persona, no se comparten con integrantes.
const mongoose = require('mongoose');

const NotificationPreferenceSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true, index: true },
  reminderFrequency: { type: String, enum: ['off', '6h', '12h', '24h'], default: '12h' },
  statusChanges: { type: Boolean, default: true },
  priorityAlerts: { type: Boolean, default: true },
  timeZone: { type: String, default: 'America/Santiago', maxlength: 80 },
}, { timestamps: true, versionKey: false });

module.exports = mongoose.models.NotificationPreference || mongoose.model('NotificationPreference', NotificationPreferenceSchema);
