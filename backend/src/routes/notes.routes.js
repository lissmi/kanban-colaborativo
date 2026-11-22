const router = require('express').Router();
const { randomUUID } = require('node:crypto');
const Project = require('../models/Project');
const ProjectNote = require('../models/ProjectNote');
const { assertProjectAccess } = require('../services/access');
const { validateNote } = require('../services/noteValidation');
const { HttpError } = require('../utils/errors');

// Los IDs no confieren acceso: validamos siempre la pertenencia al proyecto y Kanban.
async function accessibleProject(projectId, req) {
  if (typeof projectId !== 'string' || !projectId || projectId.length > 120) {
    throw new HttpError(400, 'Selecciona un proyecto válido');
  }
  const project = await Project.findOne({ id: projectId, workspaceId: req.workspace.id });
  return assertProjectAccess(project, req);
}

async function accessibleNote(noteId, req) {
  const note = await ProjectNote.findOne({ id: noteId, workspaceId: req.workspace.id });
  if (!note) throw new HttpError(404, 'Nota no encontrada');
  await accessibleProject(note.projectId, req);
  return note;
}

// Cualquier integrante autorizado del proyecto puede fijar una nota.
router.post('/', async (req, res) => {
  const project = await accessibleProject(req.body?.projectId, req);
  const content = validateNote(req.body);
  // Límite simple contra publicaciones accidentales masivas.
  if (await ProjectNote.countDocuments({ projectId: project.id }) >= 50) {
    throw new HttpError(409, 'Este proyecto alcanzó el máximo de 50 notas');
  }
  const note = await ProjectNote.create({
    id: randomUUID(), workspaceId: req.workspace.id,
    projectId: project.id, authorId: req.user.id, ...content,
  });
  res.status(201).json(note);
});

// Las notas son colaborativas: integrantes del proyecto pueden corregirlas.
router.patch('/:id', async (req, res) => {
  const note = await accessibleNote(req.params.id, req);
  const content = validateNote(req.body, true);
  Object.assign(note, content);
  await note.save();
  res.json(note);
});

// Borrado reservado al autor o administrador del Kanban; evita borrados por error.
router.delete('/:id', async (req, res) => {
  const note = await accessibleNote(req.params.id, req);
  if (req.workspaceRole !== 'admin' && note.authorId !== req.user.id) {
    throw new HttpError(403, 'Solo quien creó la nota o el administrador puede eliminarla');
  }
  await note.deleteOne();
  res.status(204).end();
});

module.exports = router;
