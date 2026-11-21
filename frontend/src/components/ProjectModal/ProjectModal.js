import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import ModalShell from '../ModalShell/ModalShell';
import { useAuth } from '../../context/AuthContext';
import './ProjectModal.css';

const ICONS = ['🌷', '💡', '🚀', '🎨', '💻', '📚', '✨', '🐱'];
const COLORS = ['lilac', 'peach', 'mint', 'blue', 'pink'];
// Los nombres de color se muestran al situar el cursor sobre cada opción.
const COLOR_NAMES = { lilac: 'Violeta', peach: 'Durazno', mint: 'Menta', blue: 'Azul', pink: 'Rosa' };

export default function ProjectModal({ members, onSave, onClose }) {
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('🌷');
  const [color, setColor] = useState('lilac');
  // Un proyecto nuevo es privado; los integrantes se añaden explícitamente.
  const [memberIds, setMemberIds] = useState(user ? [user.id] : []);

  function submit(event) {
    event.preventDefault();
    if (name.trim()) onSave({ name, description, icon, color, memberIds });
  }
  function toggleMember(id) {
    setMemberIds(prev => prev.includes(id) ? prev.filter(memberId => memberId !== id) : [...prev, id]);
  }

  return (
    <ModalShell title="Nuevo proyecto 🌷" subtitle="Un lugar para reunir todas las tareas de una idea." onClose={onClose}>
      <form className="modal-form" onSubmit={submit}>
        <label className="form-field">Nombre del proyecto *<input autoFocus required maxLength={65} placeholder="Ej: Lanzamiento de nuestra web" value={name} onChange={event => setName(event.target.value)} /></label>
        <label className="form-field">Descripción<textarea placeholder="¿Qué queremos lograr?" maxLength={220} value={description} onChange={event => setDescription(event.target.value)} /></label>
        <div className="form-field">Elige un ícono<div className="project-icon-choices">{ICONS.map(value => <button type="button" key={value} className={icon === value ? 'selected' : ''} onClick={() => setIcon(value)}>{value}</button>)}</div></div>
        <div className="form-field">Color del proyecto<div className="project-color-choices">{COLORS.map(value => <button type="button" key={value} className={`project-color-swatch tint-${value} ${color === value ? 'selected' : ''}`} title={COLOR_NAMES[value]} aria-label={`Color ${COLOR_NAMES[value]}`} onClick={() => setColor(value)} />)}</div></div>
        <div className="form-field">Participantes<div className="project-member-choices">{members.map(member => <label key={member.id}><input type="checkbox" checked={memberIds.includes(member.id)} onChange={() => toggleMember(member.id)} />{member.name}</label>)}</div></div>
        <div className="modal-buttons"><button type="button" className="btn btn-outline" onClick={onClose}>Cancelar</button><button type="submit" className="btn btn-primary"><Plus size={16} /> Crear proyecto</button></div>
      </form>
    </ModalShell>
  );
}
