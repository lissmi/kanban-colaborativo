// 🌸 Ajustes seguros previos al primer despliegue.
// Ejecutar desde la raíz: node scripts/preparar_vercel.js
// Este script agrega reglas; nunca elimina contenido existente del .gitignore.
const fs = require('node:fs');
const path = require('node:path');

// La carpeta del script está dentro de /scripts.
const root = path.resolve(__dirname, '..');
const ignorePath = path.join(root, '.gitignore');
const marker = '# === Kanban: credenciales y archivos locales (Vercel) ===';
const rules = [
  marker,
  '# Dependencias, compilaciones, temporales y archivos de Vercel.',
  '**/node_modules/',
  '**/build/',
  '**/coverage/',
  '**/.vercel/',
  '**/.cache/',
  '*.log',
  '# Variables locales: NUNCA publicar secrets de backend ni frontend.',
  '.env',
  '**/.env',
  '.env.*',
  '**/.env.*',
  '!**/.env.example',
  '# Credenciales descargadas de Google y otros proveedores.',
  '**/client_secret_*.json',
  '**/credentials*.json',
  '**/*service-account*.json',
  '**/*.pem',
  '**/*.p12',
  '# Listados del escáner antiguo: pueden contener credenciales.',
  '**/files_list*.txt',
  '**/files_list*.json',
  '.DS_Store',
  'Thumbs.db',
].join('\n') + '\n';

// Abrir el .gitignore original sin reemplazar las reglas de la persona usuaria.
const current = fs.existsSync(ignorePath) ? fs.readFileSync(ignorePath, 'utf8') : '';
if (current.includes(marker)) {
  console.log('✅ .gitignore ya contiene las reglas de protección.');
} else {
  fs.appendFileSync(ignorePath, (current && !current.endsWith('\n') ? '\n' : '') + '\n' + rules);
  console.log('✅ Reglas de protección añadidas a .gitignore (sin borrar las anteriores).');
}

// El gitignore NO retira secretos que Git ya estaba siguiendo.
console.log('➡️ Ejecuta ahora: node scripts/verificar_vercel.js');
