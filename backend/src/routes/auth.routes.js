// Google autentica la identidad; el rol se consulta por Kanban en MongoDB.
const router = require('express').Router();
const { randomUUID } = require('node:crypto');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const Member = require('../models/Member');
const WorkspaceMember = require('../models/WorkspaceMember');
const config = require('../config/env');
const { requireAuth } = require('../middleware/auth');
const { profileInput } = require('../services/validation');
const { ensurePersonalWorkspace, activateInvitations } = require('../services/workspaces');
const googleClient = new OAuth2Client();

// No hay rol global: el mismo usuario puede administrar otros espacios.
function publicUser(member) {
  return {
    id: member.id, name: member.name, email: member.email,
    color: member.color, icon: member.icon || '',
  };
}

router.get('/config', (_req, res) => {
  if (!config.googleClientId) return res.status(503).json({ error: 'Falta GOOGLE_CLIENT_ID en el backend' });
  res.json({ googleClientId: config.googleClientId });
});

// Acceso POR INVITACIÓN: el primer usuario ADMIN_EMAIL puede iniciar el sistema.
router.post('/google', async (req, res) => {
  if (!config.googleClientId || config.jwtSecret.length < 32) {
    return res.status(503).json({ error: 'Configura GOOGLE_CLIENT_ID y JWT_SECRET en el backend' });
  }
  const credential = req.body?.credential;
  if (typeof credential !== 'string' || credential.length < 100 || credential.length > 10000) {
    return res.status(400).json({ error: 'Credencial de Google inválida' });
  }
  let payload;
  try {
    const ticket = await googleClient.verifyIdToken({ idToken: credential, audience: config.googleClientId });
    payload = ticket.getPayload();
  } catch (_error) {
    return res.status(401).json({ error: 'No fue posible validar la cuenta Google' });
  }
  if (!payload?.sub || !payload.email || payload.email_verified !== true) {
    return res.status(401).json({ error: 'Necesitas una cuenta Google con correo verificado' });
  }

  const email = payload.email.trim().toLowerCase();
  let member = await Member.findOne({ googleSub: payload.sub });
  if (!member) member = await Member.findOne({ email });
  // La identidad Google verificada no equivale por sí sola a una invitación.
  const isBootstrap = Boolean(config.adminEmail && email === config.adminEmail);
  if (!member && !isBootstrap) {
    return res.status(403).json({ error: 'Tu cuenta todavía no está invitada a Kanban 🌸' });
  }
  if (member && !isBootstrap) {
    // Debe haber una membresía creada por una invitación o un Kanban existente.
    const acceptedOrPending = await WorkspaceMember.exists({ userId: member.id });
    if (!acceptedOrPending) return res.status(403).json({ error: 'Tu cuenta no tiene una invitación válida' });
  }
  if (member?.googleSub && member.googleSub !== payload.sub) {
    return res.status(403).json({ error: 'El correo ya está vinculado a otra identidad Google' });
  }
  if (member?.email && member.email !== email) {
    return res.status(403).json({ error: 'La cuenta Google asociada no coincide con este correo' });
  }
  if (!member) {
    try {
      member = await Member.create({
        id: randomUUID(), name: (payload.name || 'Mi perfil').slice(0, 70),
        email, color: 'lilac', googleSub: payload.sub, joinedAt: new Date(),
      });
    } catch (error) {
      if (error.code !== 11000) throw error;
      // Evitar registros duplicados si una persona pulsa el login dos veces.
      member = await Member.findOne({ googleSub: payload.sub });
      if (!member) throw error;
    }
  } else {
    member.googleSub = payload.sub;
    member.joinedAt ||= new Date();
    await member.save();
  }
  await ensurePersonalWorkspace(member);
  await activateInvitations(member);
  const token = jwt.sign({ sub: member.id }, config.jwtSecret, {
    algorithm: 'HS256', expiresIn: '8h',
  });
  res.json({ token, user: publicUser(member) });
});

router.get('/me', requireAuth, (req, res) => res.json({ user: publicUser(req.user) }));

// El correo/GoogleSub/roles nunca pueden modificarse con el formulario de perfil.
router.patch('/me', requireAuth, async (req, res) => {
  const data = profileInput(req.body);
  Object.assign(req.user, data);
  await req.user.save();
  res.json({ user: publicUser(req.user) });
});
module.exports = router;
