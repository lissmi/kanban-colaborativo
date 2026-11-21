import React, { useState } from 'react';
import { Check, LockKeyhole } from 'lucide-react';
import ModalShell from '../ModalShell/ModalShell';
import MemberAvatar from '../MemberAvatar/MemberAvatar';
import './ProfileModal.css';

// Mantener el mismo catálogo de opciones que valida Express.
const COLORS = [
  { id: 'lilac', name: 'Violeta' },
  { id: 'peach', name: 'Durazno' },
  { id: 'mint', name: 'Menta' },
  { id: 'blue', name: 'Azul' },
  { id: 'pink', name: 'Rosa' },
];
const ICONS = ['', '🌸', '🐱', '🌷', '✨', '🌙', '🦊', '🐼', '🦋', '🚀', '🌼', '💜', '🐧'];

// Cada usuario puede modificar solo su nombre, su color y su icono.
export default function ProfileModal({ user, onSave, onClose }) {
  const [name, setName] = useState(user?.name || '');
  const [color, setColor] = useState(user?.color || 'lilac');
  const [icon, setIcon] = useState(user?.icon || '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(event) {
    event.preventDefault();
    if (busy || !name.trim()) return;
    setBusy(true);
    setError('');
    try {
      // El backend verificará la identidad y el contenido, no confiamos en React.
      await onSave({ name: name.trim(), color, icon });
    } catch (failure) {
      setError(failure.message || 'No se pudo guardar el perfil.');
      setBusy(false);
    }
  }

  return (
    <ModalShell title="Mi perfil 🌸" subtitle="Personaliza cómo te ve tu equipo en el Kanban." onClose={onClose}>
      <form className="modal-form profile-form" onSubmit={handleSubmit}>
        <div className="profile-preview">
          <MemberAvatar member={{ name, color, icon }} className="profile-preview-avatar" />
          <div><strong>{name.trim() || 'Tu nombre'}</strong><span>{user?.email}</span></div>
        </div>
        <label className="form-field">Nombre visible *
          <input autoFocus required maxLength={70} value={name}
            onChange={event => setName(event.target.value)} placeholder="¿Cómo quieres aparecer?" />
        </label>
        <label className="form-field">Correo asociado a Google
          <input type="email" value={user?.email || ''} readOnly aria-readonly="true" className="profile-email-locked" />
        </label>
        <div className="profile-privacy-note"><LockKeyhole size={15} /> El correo no se puede modificar porque identifica tu acceso con Google.</div>
        <fieldset className="profile-option-group">
          <legend>Color de tu avatar</legend>
          <div className="profile-color-choices">
            {COLORS.map(option => (
              <button key={option.id} type="button" title={option.name}
                className={`profile-color profile-color--${option.id} ${color === option.id ? 'is-selected' : ''}`}
                aria-label={`Elegir color ${option.name}`} aria-pressed={color === option.id}
                onClick={() => setColor(option.id)} />
            ))}
          </div>
        </fieldset>
        <fieldset className="profile-option-group">
          <legend>Ícono que te representa</legend>
          <div className="profile-icon-choices">
            {ICONS.map(value => (
              <button key={value || 'iniciales'} type="button"
                className={`profile-icon ${icon === value ? 'is-selected' : ''}`}
                aria-label={value ? `Usar ícono ${value}` : 'Usar iniciales'}
                aria-pressed={icon === value} onClick={() => setIcon(value)}>
                {value || 'AB'}
              </button>
            ))}
          </div>
        </fieldset>
        {error && <p className="profile-error" role="alert">{error}</p>}
        <div className="modal-buttons">
          <button type="button" className="btn btn-outline" disabled={busy} onClick={onClose}>Cancelar</button>
          <button type="submit" className="btn btn-primary" disabled={busy || !name.trim()}>
            <Check size={16} /> {busy ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}
