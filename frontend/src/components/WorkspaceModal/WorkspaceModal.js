import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import ModalShell from '../ModalShell/ModalShell';
import './WorkspaceModal.css';

// Crear un espacio nuevo convierte a la cuenta conectada en admin SOLO allí.
export default function WorkspaceModal({ workspace = null, onSave, onClose }) {
  const [name, setName] = useState(workspace?.name || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  async function submit(event) {
    event.preventDefault();
    if (saving || !name.trim()) return;
    setSaving(true);
    setError('');
    try { await onSave(name.trim()); }
    catch (failure) { setError(failure.message); setSaving(false); }
  }
  return (
    <ModalShell title={workspace ? 'Editar Kanban ✏️' : 'Crear mi Kanban 🌸'} subtitle={workspace ? 'Cambia el nombre sin alterar integrantes, proyectos ni tareas.' : 'Tu propio espacio privado para organizar proyectos e invitar colegas.'} onClose={onClose}>
      <form className="modal-form kb-space-form" onSubmit={submit}>
        <label className="form-field">Nombre del Kanban *
          <input autoFocus required maxLength={70} value={name} onChange={event => setName(event.target.value)}
            placeholder="Ej: Kanban de Lucy" />
        </label>
        {!workspace && <p className="kb-space-form-help">Serás su administrador. Los colaboradores de otros Kanban no verán este espacio a menos que los invites.</p>}
        {error && <p className="kb-space-form-error" role="alert">{error}</p>}
        <div className="modal-buttons">
          <button type="button" className="btn btn-outline" disabled={saving} onClick={onClose}>Cancelar</button>
          <button type="submit" className="btn btn-primary" disabled={saving || !name.trim()}>
            <Plus size={16} /> {saving ? 'Guardando...' : workspace ? 'Guardar cambios' : 'Crear Kanban'}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}
