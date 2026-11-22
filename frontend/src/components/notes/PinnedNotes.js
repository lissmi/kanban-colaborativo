import React, { useState } from 'react';
import { Pin, Plus, Pencil, Trash2, ChevronDown, ChevronUp, StickyNote } from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useAuth } from '../../context/AuthContext';
import NoteModal from './NoteModal';
import ConfirmDialog from '../ConfirmDialog/ConfirmDialog';
import './PinnedNotes.css';

// Las notas permanecen fuera de las columnas del Kanban: no tienen estado ni fecha límite.
export default function PinnedNotes({ onMessage = () => {} }) {
  const { projectNotes = [], selectedProject, selectedWorkspace, createNote, updateNote, deleteNote } = useWorkspace();
  const { user } = useAuth();
  const [editing, setEditing] = useState(null);
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [deleting, setDeleting] = useState(null);
  if (!selectedProject) return null;

  // Mostrar 3 notas inicialmente evita desplazar el tablero en pantallas pequeñas.
  const shown = expanded ? projectNotes : projectNotes.slice(0, 3);
  const canDelete = note => selectedWorkspace?.role === 'admin' || note.authorId === user?.id;

  async function save(form) {
    if (editing) await updateNote(editing.id, form);
    else await createNote(form);
    setOpen(false);
    setEditing(null);
    onMessage(editing ? 'Nota actualizada y fijada 📌' : 'Nota fijada para tu equipo 📌');
  }

  // ConfirmDialog confirma primero y solo después llama al backend.
  async function removeConfirmed() {
    if (!deleting || !canDelete(deleting)) throw new Error('No tienes permiso para eliminar la nota');
    await deleteNote(deleting.id);
    onMessage('Nota eliminada del proyecto');
  }

  return (
    <section className="kb-notes" aria-labelledby="kb-notes-title">
      <header className="kb-notes__header">
        <div>
          <span className="kb-notes__eyebrow"><Pin size={13} /> SIEMPRE A LA VISTA</span>
          <h2 id="kb-notes-title"><StickyNote size={19} /> Notitas del proyecto <span>🌷</span></h2>
          <p>Instrucciones, acuerdos y enlaces de referencia, sin mezclarlos con las tareas.</p>
        </div>
        <button type="button" className="kb-notes__add" onClick={() => { setEditing(null); setOpen(true); }}>
          <Plus size={16} /> Nueva notita
        </button>
      </header>
      {projectNotes.length === 0 ? (
        <div className="kb-notes__empty"><span>📌</span> Todavía no hay notas fijadas. ¡Deja aquí lo que el equipo no debe olvidar!</div>
      ) : (
        <div className="kb-notes__grid">
          {shown.map(note => (
            <article className={`kb-note kb-note--${note.color}`} key={note.id}>
              <div className="kb-note__top">
                <span className="kb-note__pin" aria-hidden="true"><Pin size={16} fill="currentColor" /></span>
                <div className="kb-note__actions">
                  <button type="button" aria-label={`Leer o editar ${note.title}`} title="Leer o editar" onClick={() => { setEditing(note); setOpen(true); }}><Pencil size={15} /></button>
                  {canDelete(note) && <button type="button" aria-label={`Eliminar ${note.title}`} title="Eliminar nota" onClick={() => setDeleting(note)}><Trash2 size={15} /></button>}
                </div>
              </div>
              <h3>{note.title}</h3>
              <p className="kb-note__text">{note.content}</p>
              <button type="button" className="kb-note__read" onClick={() => { setEditing(note); setOpen(true); }}>Leer / editar nota</button>
            </article>
          ))}
        </div>
      )}
      {projectNotes.length > 3 && (
        <button className="kb-notes__toggle" type="button" onClick={() => setExpanded(value => !value)}>
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          {expanded ? 'Mostrar menos' : `Ver todas las notas (${projectNotes.length})`}
        </button>
      )}
      {deleting && <ConfirmDialog
        title="¿Eliminar esta notita?"
        description="Se eliminará de este proyecto para todos los integrantes. Esta acción no se puede deshacer."
        itemName={deleting.title}
        onConfirm={removeConfirmed}
        onClose={() => setDeleting(null)} />}
      {open && <NoteModal
        key={editing?.id || 'new-note'} note={editing}
        onSave={save} onClose={() => { setOpen(false); setEditing(null); }} />}
    </section>
  );
}
