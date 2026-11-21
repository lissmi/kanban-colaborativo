import React, { useState } from 'react';
import { MailCheck, Trash2 } from 'lucide-react';
import './MemberActions.css';

// Acciones independientes para cada integrante; evitamos clics dobles durante una solicitud.
export default function MemberActions({ member, onResend, onRemove }) {
  const [busy, setBusy] = useState(false);

  async function run(action) {
    if (busy) return;
    setBusy(true);
    try { await action(member); }
    finally { setBusy(false); }
  }

  return (
    <div className="member-actions">
      {member.email && (
        <button type="button" className="member-action member-action--resend"
          disabled={busy} onClick={() => run(onResend)} title={`Reenviar correo de invitación a ${member.email}`}>
          <MailCheck size={14} /> {busy ? 'Procesando...' : 'Reenviar'}
        </button>
      )}
      <button type="button" className="member-action member-action--remove"
        disabled={busy} onClick={() => run(onRemove)} title="Quitar del proyecto (no borra las tareas)">
        <Trash2 size={14} /> Quitar
      </button>
    </div>
  );
}
