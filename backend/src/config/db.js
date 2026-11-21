const mongoose = require('mongoose');
const config = require('./env');

// Reutilizamos la conexión para evitar abrir una conexión nueva en cada petición.
let connectionPromise;

async function connectDB() {
  if (mongoose.connection.readyState === 1) return mongoose.connection;

  if (!config.mongoUri) {
    throw new Error('Falta MONGODB_URI en src/middleware/.env');
  }

  if (!connectionPromise) {
    connectionPromise = mongoose.connect(config.mongoUri, {
      serverSelectionTimeoutMS: 8000,
      maxPoolSize: 5,
    }).catch(error => {
      connectionPromise = null; // Permite reintentar si MongoDB vuelve a estar disponible.
      throw error;
    });
  }

  await connectionPromise;
  return mongoose.connection;
}

module.exports = connectDB;
