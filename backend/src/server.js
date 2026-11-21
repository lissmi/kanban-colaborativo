const app = require('./app');
const config = require('./config/env');
const connectDB = require('./config/db');

// El servidor local solo arranca cuando MongoDB ya está conectado.
connectDB().then(() => {
  console.log('✅ MongoDB conectado');
  app.listen(config.port, () => {
    console.log(`🚀 API Kanban: http://localhost:${config.port}/api/health`);
  });
}).catch(error => {
  console.error('❌ No fue posible conectar con MongoDB:', error.message);
  process.exitCode = 1;
});
