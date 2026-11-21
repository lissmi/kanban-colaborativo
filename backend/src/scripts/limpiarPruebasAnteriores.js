// PREVISUALIZACIÓN: npm run legacy:preview
// ELIMINACIÓN EXPLÍCITA: npm run legacy:delete
// Nunca se borran usuarios, cuentas Google ni proyectos de Kanban nuevos.
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const Project = require('../models/Project');
const Task = require('../models/Task');

async function main() {
  await connectDB();
  const oldFilter = { $or: [
    { workspaceId: { $exists: false } },
    { workspaceId: null }, { workspaceId: '' },
  ] };
  const oldProjects = await Project.find(oldFilter).select('id name');
  const ids = oldProjects.map(project => project.id);
  const taskCount = await Task.countDocuments({ projectId: { $in: ids } });
  console.log(`Proyectos anteriores sin Kanban: ${oldProjects.length}`);
  oldProjects.forEach(p => console.log(`  • ${p.name} (${p.id})`));
  console.log(`Tareas asociadas que se borrarían: ${taskCount}`);
  if (!process.argv.includes('--confirm')) {
    console.log('MODO PREVISUALIZACIÓN: no se eliminó ningún dato.');
    return;
  }
  if (!oldProjects.length) { console.log('No hay proyectos antiguos para borrar.'); return; }
  const taskResult = await Task.deleteMany({ projectId: { $in: ids } });
  const projectResult = await Project.deleteMany(oldFilter);
  console.log(`Eliminadas ${projectResult.deletedCount} pruebas y ${taskResult.deletedCount} tareas anteriores.`);
  console.log('Las cuentas y membresías nuevas se conservaron.');
}
main().catch(error => { console.error('ERROR:', error.message); process.exitCode = 1; })
  .finally(() => mongoose.disconnect());
