import React, { useState } from 'react';
import { Plus, Save } from 'lucide-react';
import ModalShell from '../ModalShell/ModalShell';
import { useAuth } from '../../context/AuthContext';
import './ProjectModal.css';

const ICONS = ['🌷', '💡', '🚀', '🎨', '💻', '📚', '✨', '🐱'];
const COLORS = ['lilac', 'peach', 'mint', 'blue', 'pink'];
// Los nombres de color se muestran al situar el cursor sobre cada opción.
const COLOR_NAMES = { lilac: 'Violeta', peach: 'Durazno', mint: 'Menta', blue: 'Azul', pink: 'Rosa' };

export default function ProjectModal({ project = null, members, onSave, onClose }) {
  const { user } = useAuth();
  const [name, setName] = useState(project?.name || '');
  const [description, setDescription] = useState(project?.description || '');
  const [icon, setIcon] = useState(project?.icon || '🌷');
  const [color, setColor] = useState(project?.color || 'lilac');
  // Un proyecto nuevo es privado; los integrantes se añaden explícitamente.
  const [memberIds, setMemberIds] = useState(project?.memberIds || (user ? [user.id] : []));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function submit(event) {
    event.preventDefault();
    if (saving || !name.trim()) return;
    setSaving(true);
    setError('');
    try {
      await onSave({ name: name.trim(), description, icon, color, memberIds });
    } catch (failure) {
      setError(failure.message || 'No se pudo guardar el proyecto');
    } finally {
      setSaving(false);
    }
  }
  function toggleMember(id) {
    setMemberIds(prev => prev.includes(id) ? prev.filter(memberId => memberId !== id) : [...prev, id]);
  }

  return (
    <ModalShell title={project ? 'Editar proyecto ✏️' : 'Nuevo proyecto 🌷'} subtitle={project ? 'Modifica su información y participantes sin perder las tareas o notas.' : 'Un lugar para reunir todas las tareas de una idea.'} onClose={onClose}>
      <form className="modal-form" onSubmit={submit}>
        <label className="form-field">Nombre del proyecto *<input autoFocus required maxLength={65} placeholder="Ej: Lanzamiento de nuestra web" value={name} onChange={event => setName(event.target.value)} /></label>
        <label className="form-field">Descripción<textarea placeholder="¿Qué queremos lograr?" maxLength={220} value={description} onChange={event => setDescription(event.target.value)} /></label>
        <div className="form-field">Elige un ícono<div className="project-icon-choices">{ICONS.map(value => <button type="button" key={value} className={icon === value ? 'selected' : ''} onClick={() => setIcon(value)}>{value}</button>)}</div></div>
        <div className="form-field">Color del proyecto<div className="project-color-choices">{COLORS.map(value => <button type="button" key={value} className={`project-color-swatch tint-${value} ${color === value ? 'selected' : ''}`} title={COLOR_NAMES[value]} aria-label={`Color ${COLOR_NAMES[value]}`} onClick={() => setColor(value)} />)}</div></div>
        <div className="form-field">Participantes<div className="project-member-choices">{members.map(member => <label key={member.id}><input type="checkbox" checked={memberIds.includes(member.id)} onChange={() => toggleMember(member.id)} />{member.name}</label>)}</div></div>
        {project && <p className="kb-project-edit-hint" style={{ fontSize: 12, lineHeight: 1.5 }}>Si quitas a una persona del proyecto, sus tareas quedarán sin asignar. Las notas y tareas se conservan.</p>}
        {error && <p role="alert" style={{ color: '#c44366' }}>{error}</p>}
        <div className="modal-buttons"><button type="button" className="btn btn-outline" onClick={onClose} disabled={saving}>Cancelar</button><button type="submit" className="btn btn-primary" disabled={saving || !name.trim()}>{project ? <Save size={16} /> : <Plus size={16} />} {saving ? 'Guardando...' : project ? 'Guardar cambios' : 'Crear proyecto'}</button></div>
      </form>
    </ModalShell>
  );
}
