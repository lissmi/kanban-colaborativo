// 🌸 Revisión local sin conexiones externas ni lectura del contenido de secretos.
// Ejecutar desde la raíz: node scripts/verificar_vercel.js
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
let errors = 0;
let warnings = 0;

// Solo verificamos nombres y estructura, nunca imprimimos valores privados.
function exists(relative) { return fs.existsSync(path.join(root, relative)); }
function fail(message) { errors++; console.error('❌ ' + message); }
function warn(message) { warnings++; console.warn('⚠️ ' + message); }
function ok(message) { console.log('✅ ' + message); }
function protectedFile(file) {
  const normalized = file.replace(/\\/g, '/').toLowerCase();
  const base = path.posix.basename(normalized);
  return base === '.env' || base.startsWith('.env.')
    || /^client_secret_.*\.json$/.test(base)
    || /^credentials.*\.json$/.test(base)
    || /service-account.*\.json$/.test(base)
    || /^files_list.*\.(txt|json)$/.test(base)
    || /\.(pem|p12)$/.test(base);
}

// Comprobar la arquitectura de un único proyecto Vercel con dos servicios.
const required = [
  'backend/package.json', 'backend/index.js', 'backend/src/app.js',
  'vercel.json', 'frontend/package.json',
  'frontend/public/index.html', 'frontend/public/manifest.json',
  'frontend/public/sw.js', 'frontend/public/icon-192.png',
  'frontend/public/icon-512.png', 'frontend/public/icon-maskable-512.png',
  'frontend/src/index.js',
];
for (const file of required) {
  if (!exists(file)) fail('Falta ' + file);
}

// Verificar que el manifiesto define una PWA instalable.
if (exists('frontend/public/manifest.json')) {
  try {
    const manifest = JSON.parse(fs.readFileSync(path.join(root, 'frontend/public/manifest.json'), 'utf8'));
    if (manifest.display === 'standalone' && Array.isArray(manifest.icons) && manifest.icons.length >= 2) {
      ok('Manifiesto PWA: standalone e iconos declarados.');
    } else fail('El manifiesto PWA requiere display: standalone y sus iconos.');
  } catch (_err) { fail('frontend/public/manifest.json no es JSON válido.'); }
}

// Validar el único vercel.json y las rutas de Services.
if (exists('vercel.json')) {
  try {
    // Leer únicamente la configuración pública de despliegue.
    const config = JSON.parse(fs.readFileSync(path.join(root, 'vercel.json'), 'utf8'));
    const services = config.services || {};
    const routes = config.rewrites || [];
    if (services.frontend?.root !== 'frontend/' || services.backend?.root !== 'backend/') {
      fail('Services debe apuntar a frontend/ y backend/.');
    } else if (routes[0]?.destination?.service !== 'backend'
      || routes[1]?.destination?.service !== 'frontend') {
      fail('Las rutas /api deben ir al backend antes que el catch-all del frontend.');
    } else ok('vercel.json raíz: frontend y backend unidos en un solo proyecto.');
  } catch (_err) { fail('vercel.json de la raíz contiene JSON inválido.'); }
}
// Los archivos antiguos no deben permanecer si quieres una configuración única.
for (const name of ['frontend/vercel.json', 'backend/vercel.json']) {
  if (exists(name)) fail(`Elimina el archivo de configuración antiguo: ${name}`);
}

// Confirmar que .gitignore contempla los secretos (sin abrir ningún .env).
const gitignore = exists('.gitignore') ? fs.readFileSync(path.join(root, '.gitignore'), 'utf8') : '';
if (!gitignore.includes('**/client_secret_*.json') || !gitignore.includes('**/files_list*.txt')) {
  warn('Ejecuta node scripts/preparar_vercel.js para proteger credenciales y listados.');
} else ok('.gitignore protege los archivos privados conocidos.');

// Revisar si algún archivo privado YA está versionado; ignorarlo no sería suficiente.
try {
  const tracked = execFileSync('git', ['ls-files', '--cached', '-z'], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  const dangerous = tracked.split('\0').filter(Boolean).filter(protectedFile);
  if (dangerous.length) {
    for (const name of dangerous) fail('Archivo privado ya seguido por Git: ' + name);
    console.log('   Retíralos del índice con: git rm --cached -- "RUTA_DEL_ARCHIVO"');
    console.log('   Después rota las credenciales que hayan quedado expuestas.');
  } else ok('Git no rastrea archivos privados conocidos.');
} catch (_err) { warn('No hay repositorio Git accesible aquí; compruébalo en GitHub Desktop.'); }

// Las variables se deben introducir en Vercel, no copiar el .env a GitHub.
console.log('\n🔐 Backend: secretos solo en Vercel Settings → Environment Variables.');
console.log('🌐 Frontend: Vercel usa /api en el mismo dominio. No requiere variable adicional.');
console.log(`\nResultado: ${errors} error(es), ${warnings} advertencia(s).`);
if (errors) process.exitCode = 1;
