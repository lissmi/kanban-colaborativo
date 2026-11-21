import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import ModalShell from '../ModalShell/ModalShell';
import './MemberModal.css';

export default function MemberModal({ onSave, onClose }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [color, setColor] = useState('mint');

  function handleSubmit(event) {
    event.preventDefault();
    if (name.trim()) onSave({ name, email, color });
  }

  return (
    <ModalShell title="Agregar participante 💜" subtitle="Enviaremos un correo de invitación para que participe iniciando sesión con Google." onClose={onClose}>
      <form className="modal-form" onSubmit={handleSubmit}>
        <label className="form-field">Nombre *<input autoFocus required maxLength={70} placeholder="Nombre del integrante" value={name} onChange={event => setName(event.target.value)} /></label>
        <label className="form-field">Correo de Google *<input required type="email" maxLength={150} placeholder="correo@ejemplo.com" value={email} onChange={event => setEmail(event.target.value)} /></label>
        <div className="form-field">Color del avatar<div className="member-color-palette">{['lilac','peach','mint','blue','pink'].map(value => <button type="button" key={value} className={`avatar avatar--${value} ${color === value ? 'selected' : ''}`} aria-label={`Elegir ${value}`} title={value} onClick={() => setColor(value)}>✿</button>)}</div></div>
        <div className="modal-buttons"><button className="btn btn-outline" type="button" onClick={onClose}>Cancelar</button><button className="btn btn-primary" type="submit"><Plus size={16} /> Invitar</button></div>
      </form>
    </ModalShell>
  );
}
