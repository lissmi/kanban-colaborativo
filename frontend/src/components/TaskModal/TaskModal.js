import React, { useState } from 'react';
import { Plus, Trash2, X, Check, ListTodo } from 'lucide-react';
import ModalShell from '../ModalShell/ModalShell';
import { makeId, STATUSES, PRIORITIES } from '../../utils/board';
import './TaskModal.css';

export default function TaskModal({ task, initialStatus = 'todo', members, project, onSave, onDelete, onClose }) {
  const team = members.filter(member => project.memberIds.includes(member.id));
  // Un único estado controla los campos para poder guardar una tarea completa.
  const [form, setForm] = useState(() => task ? {
    ...task, subtasks: task.subtasks.map(s => ({ ...s })),
  } : {
    title: '', description: '', status: initialStatus, priority: 'medium', label: 'General',
    dueDate: '', assigneeId: team[0]?.id || '', subtasks: [],
  });
  const [newSubtask, setNewSubtask] = useState('');

  function update(field, value) { setForm(prev => ({ ...prev, [field]: value })); }
  function addSubtask() {
    if (!newSubtask.trim()) return;
    setForm(prev => ({ ...prev, subtasks: [...prev.subtasks, { id: makeId('subtask'), text: newSubtask.trim(), done: false }] }));
    setNewSubtask('');
  }
  function handleSubmit(event) {
    event.preventDefault();
    if (!form.title.trim()) return;
    onSave({ ...form, title: form.title.trim(), label: form.label.trim() || 'General' });
  }

  return (
    <ModalShell wide title={task ? 'Editar tarea ✏️' : 'Nueva tarea ✨'} subtitle="Cada gran proyecto empieza con un pequeño paso." onClose={onClose}>
      <form className="modal-form" onSubmit={handleSubmit}>
        <label className="form-field">Título de la tarea *<input autoFocus required maxLength={110} placeholder="Ej: Diseñar pantalla de inicio" value={form.title} onChange={event => update('title', event.target.value)} /></label>
        <label className="form-field">Descripción<textarea placeholder="¿Qué necesitamos hacer?" maxLength={1000} value={form.description} onChange={event => update('description', event.target.value)} /></label>
        <div className="form-grid">
          <label className="form-field">Estado<select value={form.status} onChange={event => update('status', event.target.value)}>{STATUSES.map(item => <option key={item.id} value={item.id}>{item.emoji} {item.name}</option>)}</select></label>
          <label className="form-field">Prioridad<select value={form.priority} onChange={event => update('priority', event.target.value)}>{PRIORITIES.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <label className="form-field">Responsable<select value={form.assigneeId} onChange={event => update('assigneeId', event.target.value)}><option value="">Sin asignar</option>{team.map(member => <option key={member.id} value={member.id}>{member.name}</option>)}</select></label>
          <label className="form-field">Fecha límite<input type="date" value={form.dueDate} onChange={event => update('dueDate', event.target.value)} /></label>
        </div>
        <label className="form-field">Etiqueta<input maxLength={30} placeholder="Ej: Diseño, Backend, Reunión" value={form.label} onChange={event => update('label', event.target.value)} /></label>
        <div className="subtasks-editor">
          <div className="subtasks-title"><ListTodo size={15} /><strong>Subtareas</strong><span>{form.subtasks.filter(subtask => subtask.done).length}/{form.subtasks.length}</span></div>
          {form.subtasks.map(subtask => (
            <div className="subtask-row" key={subtask.id}>
              <label><input type="checkbox" checked={subtask.done} onChange={event => setForm(prev => ({ ...prev, subtasks: prev.subtasks.map(s => s.id === subtask.id ? { ...s, done: event.target.checked } : s) }))} /><span className={subtask.done ? 'subtask-done' : ''}>{subtask.text}</span></label>
              <button className="btn-icon" type="button" title="Eliminar subtarea" onClick={() => setForm(prev => ({ ...prev, subtasks: prev.subtasks.filter(s => s.id !== subtask.id) }))}><X size={14} /></button>
            </div>
          ))}
          <div className="subtask-add"><input placeholder="Agregar una subtarea..." value={newSubtask} onChange={event => setNewSubtask(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); addSubtask(); } }} /><button type="button" onClick={addSubtask} title="Agregar subtarea"><Plus size={17} /></button></div>
        </div>
        <div className="modal-buttons">
          {task && <button className="btn btn-delete" type="button" onClick={() => { if (window.confirm('¿Eliminar esta tarea?')) onDelete(task.id); }}><Trash2 size={16} /> Eliminar</button>}
          <button type="button" className="btn btn-outline" onClick={onClose}>Cancelar</button>
          <button type="submit" className="btn btn-primary"><Check size={16} /> {task ? 'Guardar cambios' : 'Crear tarea'}</button>
        </div>
      </form>
    </ModalShell>
  );
}
