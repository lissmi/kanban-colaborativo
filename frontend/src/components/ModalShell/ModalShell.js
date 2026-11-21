import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import './ModalShell.css';

// Componente reutilizable para los tres formularios: tarea, proyecto y participante.
export default function ModalShell({ title, subtitle, onClose, children, wide = false }) {
  useEffect(() => {
    function handleKey(event) { if (event.key === 'Escape') onClose(); }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  return (
    <div className="modal-overlay" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
      <div className={`modal-window ${wide ? 'modal-window--wide' : ''}`} role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal-head"><div><h2>{title}</h2><p>{subtitle}</p></div><button type="button" className="btn-icon" title="Cerrar" aria-label="Cerrar" onClick={onClose}><X size={19} /></button></div>
        {children}
      </div>
    </div>
  );
}
