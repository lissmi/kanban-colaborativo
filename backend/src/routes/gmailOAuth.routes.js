// Callback de Google para autorizar una vez el remitente de las invitaciones.
const router = require('express').Router();
const jwt = require('jsonwebtoken');
const config = require('../config/env');
const { createGmailOAuthClient } = require('../mail/gmailService');

router.get('/callback', async (req, res) => {
  // Nunca exponemos este flujo de configuración en producción.
  if (process.env.VERCEL || process.env.NODE_ENV === 'production') return res.status(404).end();
  res.set('Cache-Control', 'no-store');
  try {
    if (config.jwtSecret.length < 32) throw new Error('JWT_SECRET es obligatorio');
    if (typeof req.query.state !== 'string' || typeof req.query.code !== 'string') {
      return res.status(400).send('Falta el código OAuth o el estado de autorización.');
    }
    // El enlace temporal lleva un JWT firmado para evitar estados inventados.
    const state = jwt.verify(req.query.state, config.jwtSecret, { algorithms: ['HS256'] });
    if (state.purpose !== 'gmail-setup' || typeof state.nonce !== 'string') {
      return res.status(403).send('Autorización no válida.');
    }
    const oauth = createGmailOAuthClient();
    const { tokens } = await oauth.getToken(req.query.code);
    if (!tokens.id_token) throw new Error('Google no devolvió la identidad de la cuenta emisora');
    const ticket = await oauth.verifyIdToken({
      idToken: tokens.id_token, audience: config.googleClientId,
    });
    const googleUser = ticket.getPayload();
    if (!config.mailUser || googleUser?.email_verified !== true ||
        googleUser.email?.toLowerCase() !== config.mailUser) {
      return res.status(403).send('La cuenta debe coincidir con MAIL_USER.');
    }
    if (!tokens.refresh_token) throw new Error('No hay refresh token; vuelve a autorizar con prompt=consent.');

    // Se imprime SOLO en la consola local del backend. Nunca en el navegador ni en React.
    console.log('\n✅ Gmail autorizado para', config.mailUser);
    console.log('Copia esta variable en backend/src/middleware/.env:');
    console.log(`GMAIL_REFRESH_TOKEN=${tokens.refresh_token}`);
    console.log('Reinicia npm run dev después de guardarla.\n');
    res.type('html').send('<!doctype html><html lang="es"><meta charset="utf-8"><title>Gmail autorizado</title><body style="font-family:Arial;background:#171827;color:#fff;padding:40px"><h1>✅ Gmail autorizado 🌸</h1><p>Revisa la terminal del backend y copia GMAIL_REFRESH_TOKEN en tu archivo .env. Después reinicia Express.</p></body></html>');
  } catch (error) {
    console.error('[Autorización Gmail]', error.message);
    return res.status(400).send('No se pudo autorizar Gmail. Revisa el correo, Client ID, Client Secret y URI de retorno.');
  }
});
module.exports = router;
