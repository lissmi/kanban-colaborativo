import React, { useEffect, useRef, useState } from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';
import './ConfirmDialog.css';

/**
 * Confirmación accesible compartida por tareas, notitas, proyectos y Kanban.
 * Para eliminaciones que afectan varios registros, exige escribir el nombre.
 * onConfirm devuelve una Promise: el cuadro solo desaparece si la API tuvo éxito.
 */
export default function ConfirmDialog({ title, description, itemName = '', requireText = '', onConfirm, onClose }) {
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const cancelRef = useRef(null);
  const dialogRef = useRef(null);
  const labelId = React.useId();
  const descriptionId = React.useId();

  useEffect(() => {
    // El foco inicia en Cancelar para no confirmar un borrado por accidente.
    const previousFocus = document.activeElement;
    cancelRef.current?.focus();
    const priorOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = priorOverflow;
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, []);

  function handleKeys(event) {
    // Impide que Escape cierre también el formulario de tarea que queda debajo.
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      if (!busy) onClose();
      return;
    }
    // Mantiene el foco dentro del diálogo mientras está abierto.
    if (event.key === 'Tab') {
      const focusables = [...dialogRef.current.querySelectorAll('button:not([disabled]),input:not([disabled])')];
      if (!focusables.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault(); last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault(); first.focus();
      }
    }
  }

  async function confirm() {
    if (busy || (requireText && typed !== requireText)) return;
    setBusy(true);
    setError('');
    try {
      await onConfirm();
      onClose();
    } catch (failure) {
      setError(failure?.message || 'No fue posible completar la operación.');
      setBusy(false);
    }
  }

  return (
    <div className="kb-confirm-overlay" onMouseDown={event => {
      if (event.target === event.currentTarget && !busy) onClose();
    }}>
      <section ref={dialogRef} className="kb-confirm-card" role="alertdialog" aria-modal="true"
        aria-labelledby={labelId} aria-describedby={descriptionId} onKeyDown={handleKeys}>
        <button type="button" className="kb-confirm-close" aria-label="Cerrar confirmación"
          onClick={onClose} disabled={busy}><X size={19} /></button>
        <div className="kb-confirm-icon"><AlertTriangle size={26} /></div>
        <h2 id={labelId}>{title}</h2>
        <p id={descriptionId}>{description}</p>
        {itemName && <div className="kb-confirm-item" title={itemName}>{itemName}</div>}
        {requireText && (
          <label className="kb-confirm-verify">
            Para confirmar, escribe exactamente <strong>{requireText}</strong>
            <input autoComplete="off" spellCheck={false} value={typed}
              onChange={event => setTyped(event.target.value)} placeholder="Escribe el nombre aquí" />
          </label>
        )}
        {error && <p className="kb-confirm-error" role="alert">{error}</p>}
        <div className="kb-confirm-actions">
          <button ref={cancelRef} type="button" className="kb-confirm-cancel" onClick={onClose} disabled={busy}>Cancelar</button>
          <button type="button" className="kb-confirm-delete" onClick={confirm}
            disabled={busy || Boolean(requireText && typed !== requireText)}>
            <Trash2 size={16} /> {busy ? 'Eliminando...' : 'Sí, eliminar'}
          </button>
        </div>
      </section>
    </div>
  );
}
