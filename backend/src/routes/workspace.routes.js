const router = require('express').Router();
const Project = require('../models/Project');
const Member = require('../models/Member');
const Task = require('../models/Task');
const ProjectNote = require('../models/ProjectNote');
const { projectQuery } = require('../services/access');

// Este endpoint nunca puede devolver documentos de otro Kanban.
router.get('/', async (req, res) => {
  const projects = await Project.find(projectQuery(req)).sort({ createdAt: 1 });
  const ids = projects.map(project => project.id);
  const memberIds = [...new Set([req.user.id, ...projects.flatMap(project => project.memberIds)])];
  const [members, tasks, notes] = await Promise.all([
    Member.find({ id: { $in: memberIds } }).sort({ createdAt: 1 }),
    Task.find({ projectId: { $in: ids } }).sort({ createdAt: 1 }),
    // Las notas se filtran por los mismos proyectos autorizados que las tareas.
    ProjectNote.find({ workspaceId: req.workspace.id, projectId: { $in: ids } }).sort({ createdAt: -1 }),
  ]);
  res.json({ projects, members, tasks, notes });
});
module.exports = router;
