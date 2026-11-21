const jwt = require('jsonwebtoken');
const Member = require('../models/Member');
const config = require('../config/env');

// La sesión demuestra quién es el usuario, pero NO qué Kanban administra.
async function requireAuth(req, res, next) {
  const authorization = req.get('authorization') || '';
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';
  if (!token || !config.jwtSecret) return res.status(401).json({ error: 'Debes iniciar sesión' });
  try {
    const session = jwt.verify(token, config.jwtSecret, { algorithms: ['HS256'] });
    const user = await Member.findOne({ id: session.sub, googleSub: { $exists: true, $ne: '' } });
    if (!user) return res.status(401).json({ error: 'Sesión sin acceso' });
    req.user = user;
    next();
  } catch (_error) {
    return res.status(401).json({ error: 'Sesión vencida o inválida' });
  }
}
// requireSpaceAdmin está en middleware/workspace.js y consulta WorkspaceMember.
module.exports = { requireAuth };
