// Sesión persistente segura: cookie HttpOnly + secreto aleatorio guardado solo como hash.
// El JWT corto sigue en sessionStorage; la cookie nunca es visible para React.
const { randomBytes, createHash } = require('node:crypto');
const PersistentSession = require('../models/PersistentSession');
const Member = require('../models/Member');
const config = require('../config/env');

const COOKIE_NAME = 'kb_session';
const SESSION_MS = 30 * 24 * 60 * 60 * 1000; // 30 días, renovados al usar la PWA.
const COOKIE_PATH = '/api/auth';

function cookieOptions() {
  return {
    httpOnly: true, // Bloquea acceso por document.cookie desde JavaScript.
    secure: process.env.NODE_ENV === 'production' || Boolean(process.env.VERCEL),
    sameSite: 'strict', // La cookie no viaja en solicitudes de sitios ajenos.
    path: COOKIE_PATH,
    maxAge: SESSION_MS,
  };
}

function hashToken(token) {
  return createHash('sha256').update(token).digest('hex');
}

function readCookieToken(req) {
  // Sin dependencias adicionales: el token se genera como 64 dígitos hexadecimales.
  const cookieHeader = req.get('cookie') || '';
  const match = cookieHeader.match(/(?:^|;\s*)kb_session=([a-f0-9]{64})(?:;|$)/);
  return match ? match[1] : '';
}

// Autoriza el dominio HTTPS real donde Vercel sirve esta petición, incluidas sus URL alternativas.
// Así el refresh no falla si FRONTEND_URL se configuró con http o con otro alias.
function isAllowedBrowserOrigin(req) {
  const origin = req.get('origin');
  if (!origin) return true; // Solicitudes sin cabecera Origin, como curl y navegación interna.
  try {
    const parsed = new URL(origin);
    // En Vercel solo autorizamos orígenes HTTPS.
    if (process.env.VERCEL && parsed.protocol !== 'https:') return false;
    // No permitir esquemas ajenos a HTTP(S) o una URL que contenga credenciales.
    if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password) return false;
    // El dominio en el que el navegador está realmente navegando es válido para su propia API.
    // El encabezado Host no se obtiene de X-Forwarded-Host suministrado por terceros.
    const requestHost = String(req.get('host') || '').toLowerCase();
    if (requestHost && parsed.host.toLowerCase() === requestHost) {
      return !process.env.VERCEL || parsed.protocol === 'https:';
    }
    // Conservar los orígenes explícitos de desarrollo (por ejemplo localhost:3000 → localhost:5000).
    const allowed = [config.frontendUrl, ...config.corsOrigins];
    return allowed.some(value => {
      try { return new URL(value).origin === parsed.origin; }
      catch (_error) { return false; }
    });
  } catch (_error) {
    return false;
  }
}

function checkTrustedOrigin(req) {
  // Los endpoints de cookies no deben aceptar llamadas realizadas desde otra web.
  if (req.get('sec-fetch-site') === 'cross-site') return false;
  return isAllowedBrowserOrigin(req);
}

async function createPersistentSession(userId, res) {
  // El token opaco jamás se devuelve en el JSON ni se escribe en los logs.
  const token = randomBytes(32).toString('hex');
  await PersistentSession.create({
    userId,
    tokenHash: hashToken(token),
    expiresAt: new Date(Date.now() + SESSION_MS),
  });
  res.cookie(COOKIE_NAME, token, cookieOptions());
}

async function clearPersistentSession(req, res) {
  const token = readCookieToken(req);
  if (token) await PersistentSession.deleteOne({ tokenHash: hashToken(token) });
  const { maxAge, ...options } = cookieOptions();
  res.clearCookie(COOKIE_NAME, options);
}

async function refreshPersistentSession(token, res) {
  if (!token) return null;
  const tokenHash = hashToken(token);
  const now = new Date();
  // Condición de vencimiento atómica, incluso antes de que MongoDB aplique el TTL.
  const session = await PersistentSession.findOneAndUpdate(
    { tokenHash, expiresAt: { $gt: now } },
    { $set: { expiresAt: new Date(Date.now() + SESSION_MS) } },
    { new: true },
  );
  if (!session) {
    const { maxAge, ...options } = cookieOptions();
    res.clearCookie(COOKIE_NAME, options);
    return null;
  }
  const member = await Member.findOne({
    id: session.userId,
    googleSub: { $exists: true, $ne: '' },
  });
  if (!member) {
    await PersistentSession.deleteOne({ _id: session._id });
    const { maxAge, ...options } = cookieOptions();
    res.clearCookie(COOKIE_NAME, options);
    return null;
  }
  // Extender la sesión y la caducidad del navegador al volver a abrir la aplicación.
  res.cookie(COOKIE_NAME, token, cookieOptions());
  return member;
}

module.exports = {
  isAllowedBrowserOrigin, checkTrustedOrigin, readCookieToken,
  createPersistentSession, clearPersistentSession, refreshPersistentSession,
};
