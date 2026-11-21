const InviteCounter = require('../models/InviteCounter');
const { HttpError } = require('../utils/errors');

// Una persona puede utilizar el remitente Gmail hasta 20 veces por día UTC.
// El contador se aumenta con una única operación atómica en MongoDB.
async function reserveInvitation(userId) {
  const key = `${userId}:${new Date().toISOString().slice(0, 10)}`;
  try {
    await InviteCounter.findOneAndUpdate(
      { key, used: { $lt: 20 } },
      {
        $inc: { used: 1 },
        $setOnInsert: { expiresAt: new Date(Date.now() + 4 * 24 * 3600 * 1000) },
      },
      { upsert: true, new: true },
    );
  } catch (error) {
    // Cuando ya se alcanzó el límite, el índice único impide otro upsert.
    if (error.code === 11000) throw new HttpError(429, 'Límite de 20 correos diarios alcanzado. Intenta mañana.');
    throw error;
  }
}
module.exports = { reserveInvitation };
