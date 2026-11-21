const path = require('node:path');
const dotenv = require('dotenv');

// Respeta tu ubicación de .env dentro de src/middleware.
dotenv.config({ path: path.join(__dirname, '..', 'middleware', '.env'), quiet: true });

const config = {
  port: Number(process.env.PORT || 5000),
  mongoUri: process.env.MONGODB_URI,
  corsOrigins: (process.env.CORS_ORIGIN || 'http://localhost:3000')
    .split(',').map(origin => origin.trim()).filter(Boolean),
  googleClientId: process.env.GOOGLE_CLIENT_ID || '',
  adminEmail: (process.env.ADMIN_EMAIL || '').trim().toLowerCase(),
  jwtSecret: process.env.JWT_SECRET || '',
  // Configuración de Gmail API: nunca se expone al frontend.
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
  gmailRedirectUri: process.env.GMAIL_REDIRECT_URI || 'http://localhost:5000/api/auth/gmail/callback',
  gmailRefreshToken: process.env.GMAIL_REFRESH_TOKEN || '',
  mailUser: (process.env.MAIL_USER || '').trim().toLowerCase(),
  frontendUrl: (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, ''),
  // VAPID se utiliza solo para Web Push: la clave privada nunca sale de Express.
  vapidPublicKey: process.env.VAPID_PUBLIC_KEY || '',
  vapidPrivateKey: process.env.VAPID_PRIVATE_KEY || '',
  vapidSubject: process.env.VAPID_SUBJECT || (process.env.MAIL_USER ? `mailto:${process.env.MAIL_USER}` : ''),
  // El cron necesita autenticación propia, independiente de la cuenta Google.
  cronSecret: process.env.CRON_SECRET || '',
};

module.exports = config;
