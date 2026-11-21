// Script local para generar la autorización OAuth de Gmail con acceso offline.
const { randomBytes } = require('node:crypto');
const jwt = require('jsonwebtoken');
const config = require('../config/env');
const { createGmailOAuthClient } = require('../mail/gmailService');

if (process.env.VERCEL || process.env.NODE_ENV === 'production') {
  throw new Error('Autoriza Gmail únicamente desde tu computador, en desarrollo');
}
if (config.jwtSecret.length < 32 || !config.mailUser) {
  throw new Error('Configura JWT_SECRET y MAIL_USER en el .env del backend');
}
// State temporal firmado para verificar que el retorno pertenece a esta configuración.
const state = jwt.sign(
  { purpose: 'gmail-setup', nonce: randomBytes(16).toString('hex') },
  config.jwtSecret,
  { algorithm: 'HS256', expiresIn: '10m' }
);
const client = createGmailOAuthClient();
const authorizationUrl = client.generateAuthUrl({
  access_type: 'offline',
  prompt: 'consent',
  scope: ['openid', 'email', 'https://www.googleapis.com/auth/gmail.send'],
  state,
});
console.log('\n1. Mantén el backend abierto con npm run dev.');
console.log('2. Abre esta URL en el navegador, usando la cuenta MAIL_USER:\n');
console.log(authorizationUrl);
console.log('\n3. Copia GMAIL_REFRESH_TOKEN de la terminal donde corre npm run dev.\n');
