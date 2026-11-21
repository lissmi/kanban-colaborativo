// ✉️ Servicio de Gmail API: toda la lógica y los secretos quedan en Express.
const { randomBytes } = require('node:crypto');
const { google } = require('googleapis');
const config = require('../config/env');

// Reutilizamos el mismo cliente OAuth creado en Google Cloud.
function createGmailOAuthClient() {
  if (!config.googleClientId || !config.googleClientSecret) {
    throw new Error('Configura GOOGLE_CLIENT_ID y GOOGLE_CLIENT_SECRET en el .env del backend');
  }
  return new google.auth.OAuth2(
    config.googleClientId,
    config.googleClientSecret,
    config.gmailRedirectUri
  );
}

// Escapamos datos dinámicos para evitar que alteren nuestro HTML.
function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[char]));
}

// Creamos tanto versión HTML como texto plano para clientes de correo distintos.
function buildInvitation({ name, projectName, senderName, url }) {
  const greeting = name?.trim() || '¡Hola!';
  const sender = senderName?.trim() || 'Tu equipo';
  const safeGreeting = escapeHtml(greeting);
  const safeSender = escapeHtml(sender);
  const safeProject = escapeHtml(projectName);
  const safeUrl = escapeHtml(url);

  const html = `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3effb;font-family:Arial,Helvetica,sans-serif;color:#26243b;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;background:#f3effb;"><tr><td align="center" style="padding:32px 14px;">
<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:560px;border-collapse:separate;border-spacing:0;background:#fff;border-radius:24px;overflow:hidden;box-shadow:0 12px 42px rgba(43,32,82,.09);">
<tr><td align="center" style="padding:30px 24px 20px;background:#1d2034;">
<div style="font-size:28px;font-weight:800;letter-spacing:-1px;color:#fff;">kanban <span style="color:#e6b7ff;">🌸</span></div>
<div style="color:#c8c7df;font-size:13px;margin-top:8px;">Tu espacio bonito para trabajar en equipo</div>
</td></tr>
<tr><td style="padding:34px 38px 28px;">
<div style="display:inline-block;background:#f1e9ff;border-radius:100px;padding:7px 13px;color:#7655bd;font-size:13px;font-weight:bold;">💌 Una invitación para ti</div>
<h1 style="font-size:29px;line-height:1.2;margin:22px 0 14px;color:#24223b;">¡Tenemos un proyecto para compartir! ✨</h1>
<p style="margin:0 0 18px;font-size:16px;line-height:1.7;">Hola, <strong>${safeGreeting}</strong> 👋</p>
<p style="margin:0 0 22px;font-size:16px;line-height:1.7;"><strong>${safeSender}</strong> te invitó a colaborar en este proyecto:</p>
<div style="border:1px solid #e6ddfa;background:#faf7ff;border-radius:16px;padding:19px 22px;margin:0 0 25px;">
<div style="font-size:12px;letter-spacing:1px;color:#8272ae;font-weight:bold;">🌷 PROYECTO</div>
<div style="font-size:20px;line-height:1.35;font-weight:750;color:#392d65;margin-top:7px;">${safeProject}</div>
</div>
<p style="font-size:15px;line-height:1.8;margin:0 0 25px;">Aquí podrán organizar tareas, compartir avances y celebrar cada objetivo cumplido. 🎉</p>
<table role="presentation" cellpadding="0" cellspacing="0" style="border-collapse:separate;"><tr><td style="background:#9375dd;border-radius:12px;">
<a href="${safeUrl}" style="display:inline-block;padding:16px 27px;color:#fff;text-decoration:none;font-size:16px;font-weight:bold;">Entrar al proyecto 🌸</a>
</td></tr></table>
<p style="font-size:13px;line-height:1.65;color:#7b7891;margin:24px 0 0;">Para entrar, inicia sesión con Google usando <strong>esta misma dirección de correo</strong>. No necesitas crear otra contraseña.</p>
</td></tr>
<tr><td style="padding:22px 38px;background:#f8f5ff;border-top:1px solid #eee7fb;color:#77718b;font-size:12px;line-height:1.6;">
Enviado desde Kanban Colaborativo 🌸<br>Si no esperabas esta invitación, puedes ignorar el mensaje.
</td></tr></table>
<p style="color:#928ba9;font-size:11px;margin-top:20px;">Organiza bonito. Avanza a tu ritmo. 💜</p>
</td></tr></table></body></html>`;

  const text = `¡Te invitaron a Kanban Colaborativo! 🌸\n\nHola, ${greeting}:\n\n${sender} te invitó a colaborar en el proyecto: ${projectName}\n\nEntra al proyecto: ${url}\n\nInicia sesión con Google usando esta misma dirección de correo. No necesitas otra contraseña.\n\nSi no esperabas esta invitación, puedes ignorar el mensaje.`;
  return { html, text };
}

// Gmail API requiere que el mensaje MIME vaya codificado como base64url.
function encodeEmail({ to, from, subject, html, text }) {
  const boundary = `kanban_${randomBytes(12).toString('hex')}`;
  const subjectEncoded = Buffer.from(subject, 'utf8').toString('base64');
  const encodedPlain = Buffer.from(text, 'utf8').toString('base64');
  const encodedHtml = Buffer.from(html, 'utf8').toString('base64');
  const mime = [
    `From: ${from}`, `To: ${to}`, `Subject: =?UTF-8?B?${subjectEncoded}?=`,
    'MIME-Version: 1.0', `Content-Type: multipart/alternative; boundary="${boundary}"`, '',
    `--${boundary}`, 'Content-Type: text/plain; charset="UTF-8"',
    'Content-Transfer-Encoding: base64', '', encodedPlain,
    `--${boundary}`, 'Content-Type: text/html; charset="UTF-8"',
    'Content-Transfer-Encoding: base64', '', encodedHtml,
    `--${boundary}--`, '',
  ].join('\r\n');
  return Buffer.from(mime, 'utf8').toString('base64url');
}

// Se ejecuta después de crear o actualizar al participante en MongoDB.
async function sendProjectInvitation({ to, name, projectName, senderName, url }) {
  if (!config.gmailRefreshToken || !config.mailUser) {
    throw new Error('Faltan GMAIL_REFRESH_TOKEN o MAIL_USER en backend/src/middleware/.env');
  }
  const oauth = createGmailOAuthClient();
  oauth.setCredentials({ refresh_token: config.gmailRefreshToken });
  const gmail = google.gmail({ version: 'v1', auth: oauth });
  const { html, text } = buildInvitation({
    name, projectName, senderName, url: url || config.frontendUrl,
  });
  const raw = encodeEmail({
    to, from: config.mailUser, subject: '🌸 ¡Te invitaron a colaborar en Kanban!',
    html, text,
  });
  const response = await gmail.users.messages.send({
    userId: 'me', requestBody: { raw },
  });
  return response.data.id;
}

module.exports = { createGmailOAuthClient, buildInvitation, sendProjectInvitation };
