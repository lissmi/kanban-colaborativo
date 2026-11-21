// Cada navegador/dispositivo tiene una suscripción cifrada propia de Web Push.
const mongoose = require('mongoose');

const PushSubscriptionSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  // El endpoint funciona como una dirección secreta: nunca devolverlo en listados públicos.
  endpoint: { type: String, required: true, unique: true, maxlength: 2048 },
  keys: {
    p256dh: { type: String, required: true, maxlength: 512 },
    auth: { type: String, required: true, maxlength: 512 },
  },
  userAgent: { type: String, default: '', maxlength: 200 },
}, { timestamps: true, versionKey: false });

module.exports = mongoose.models.PushSubscription || mongoose.model('PushSubscription', PushSubscriptionSchema);
