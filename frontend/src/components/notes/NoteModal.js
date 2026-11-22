import React, { useState } from 'react';
import { Pin, Save } from 'lucide-react';
import ModalShell from '../ModalShell/ModalShell';

const COLORS = [
  { id: 'yellow', label: 'Amarillo' },
  { id: 'lilac', label: 'Lavanda' },
  { id: 'blue', label: 'Azul' },
  { id: 'pink', label: 'Rosa' },
  { id: 'mint', label: 'Menta' },
];

// Modal con validación nativa; ningún dato sensible se almacena en el navegador.
export default function NoteModal({ note, onSave, onClose }) {
  const [title, setTitle] = useState(note?.title || '');
  const [content, setContent] = useState(note?.content || '');
  const [color, setColor] = useState(note?.color || 'yellow');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(event) {
    event.preventDefault();
    if (busy || !title.trim() || !content.trim()) return;
    setBusy(true);
    setError('');
    try { await onSave({ title: title.trim(), content: content.trim(), color }); }
    catch (failure) { setError(failure.message || 'No se pudo guardar la nota.'); }
    finally { setBusy(false); }
  }

  return <ModalShell title={note ? 'Editar notita 📌' : 'Nueva notita 📌'}
    subtitle="Una referencia fija para quienes colaboran en este proyecto." onClose={onClose}>
    <form className="kb-note-form" onSubmit={submit}>
      <label className="kb-note-form__field">Título de la nota *
        <input autoFocus required maxLength={70} value={title} onChange={event => setTitle(event.target.value)}
          placeholder="Ej.: Pasos para publicar la web" />
      </label>
      <label className="kb-note-form__field">Contenido *
        <textarea required maxLength={1400} rows={7} value={content} onChange={event => setContent(event.target.value)}
          placeholder="Agrega instrucciones, enlaces o acuerdos que el equipo deba recordar..." />
      </label>
      <div className="kb-note-form__counter">{content.length}/1400 caracteres</div>
      <fieldset className="kb-note-form__palette"><legend>Color del post-it</legend>
        <div>{COLORS.map(option => (
          <button key={option.id} type="button" title={option.label} aria-label={`Color ${option.label}`}
            aria-pressed={color === option.id} onClick={() => setColor(option.id)}
            className={`kb-note-form__swatch kb-note-form__swatch--${option.id} ${color === option.id ? 'is-active' : ''}`} />
        ))}</div>
      </fieldset>
      <p className="kb-note-form__warning">🔐 Las notas son visibles para integrantes del proyecto. No guardes contraseñas, tokens, claves API ni códigos de recuperación. Utiliza un gestor de secretos y deja aquí solo la referencia.</p>
      {error && <p className="kb-note-form__error" role="alert">{error}</p>}
      <div className="modal-buttons kb-note-form__buttons">
        <button className="btn btn-outline" type="button" onClick={onClose} disabled={busy}>Cancelar</button>
        <button className="btn btn-primary" type="submit" disabled={busy || !title.trim() || !content.trim()}>
          {note ? <Save size={16} /> : <Pin size={16} />}{busy ? 'Guardando...' : note ? 'Guardar cambios' : 'Fijar nota'}
        </button>
      </div>
    </form>
  </ModalShell>;
}
