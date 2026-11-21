const mongoose = require('mongoose');

const SubtaskSchema = new mongoose.Schema({
  id: { type: String, required: true },
  text: { type: String, required: true, maxlength: 180 },
  done: { type: Boolean, default: false },
}, { _id: false });

const TaskSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, index: true },
  projectId: { type: String, required: true, index: true },
  title: { type: String, required: true, maxlength: 110 },
  description: { type: String, default: '', maxlength: 1000 },
  status: { type: String, enum: ['todo', 'doing', 'review', 'done'], default: 'todo' },
  priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
  label: { type: String, default: 'General', maxlength: 30 },
  dueDate: { type: String, default: '' },
  assigneeId: { type: String, default: '' },
  subtasks: { type: [SubtaskSchema], default: [] },
}, { timestamps: true, versionKey: false });

TaskSchema.set('toJSON', {
  transform: (_, result) => { delete result._id; return result; },
});

module.exports = mongoose.models.Task || mongoose.model('Task', TaskSchema);
