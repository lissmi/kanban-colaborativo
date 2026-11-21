const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { rateLimit } = require('express-rate-limit');
const config = require('./config/env');
const connectDB = require('./config/db');
const authRoutes = require('./routes/auth.routes');
const gmailOAuthRoutes = require('./routes/gmailOAuth.routes');
const spacesRoutes = require('./routes/spaces.routes');
const workspaceRoutes = require('./routes/workspace.routes');
const projectRoutes = require('./routes/projects.routes');
const memberRoutes = require('./routes/members.routes');
const taskRoutes = require('./routes/tasks.routes');
const notificationsRoutes = require('./routes/notifications.routes');
const cronRoutes = require('./routes/cron.routes');
const { requireAuth } = require('./middleware/auth');
const { requireWorkspace } = require('./middleware/workspace');
const errorHandler = require('./middleware/errorHandler');

const app = express();
// En Vercel, confiar solamente en el último proxy para identificar la IP del cliente.
// Sin esta configuración, el rate limiter podría contar a distintos usuarios como uno solo.
if (process.env.VERCEL === '1') app.set('trust proxy', 1);
app.disable('x-powered-by');
app.use(helmet());
app.use(cors({
  origin(origin, callback) {
    if (!origin || config.corsOrigins.includes(origin)) return callback(null, true);
    return callback(Object.assign(new Error('Origen no permitido por CORS'), { status: 403 }));
  },
  // La cabecera x-workspace-id es usada por Axios y verificada por Express.
  allowedHeaders: ['Authorization', 'Content-Type', 'X-Workspace-Id'],
}));
app.use(express.json({ limit: '100kb' }));
app.use('/api', rateLimit({ windowMs: 60000, limit: 120, standardHeaders: 'draft-8', legacyHeaders: false }));
app.get('/api/health', (_req, res) => res.json({ ok: true, service: 'kanban-api' }));
app.use('/api', async (_req, _res, next) => {
  try { await connectDB(); next(); } catch (error) { next(error); }
});

// El login de Google valida solo cuentas previamente invitadas o la cuenta inicial ADMIN_EMAIL.
app.use('/api/auth', authRoutes);
app.use('/api/auth/gmail', gmailOAuthRoutes);
// El cron se autentica con CRON_SECRET, no requiere JWT ni espacio activo.
app.use('/api/cron', cronRoutes);
app.use('/api', requireAuth);
// Las suscripciones pertenecen al usuario y pueden agrupar varios Kanban autorizados.
app.use('/api/notifications', notificationsRoutes);
// La lista/creación de espacios no requiere seleccionar uno previamente.
app.use('/api/spaces', spacesRoutes);
// Nunca se permite leer ni modificar datos sin validar el Kanban seleccionado.
app.use('/api', requireWorkspace);
app.use('/api/workspace', workspaceRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/members', memberRoutes);
app.use('/api/tasks', taskRoutes);
app.use((req, _res, next) => next(Object.assign(new Error('Ruta no encontrada'), { status: 404 })));
app.use(errorHandler);
module.exports = app;
