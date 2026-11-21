import React from 'react';
import { Plus, Users } from 'lucide-react';
import ModalShell from '../ModalShell/ModalShell';
import MemberAvatar from '../MemberAvatar/MemberAvatar';
import './TeamModal.css';

export default function TeamModal({ project, members, tasks, onAddMember, onClose }) {
  const team = members.filter(member => project.memberIds.includes(member.id));
  return (
    <ModalShell title="Nuestro equipo 💜" subtitle={`Participantes de «${project.name}»`} onClose={onClose}>
      <div className="team-modal-list">
        {team.length ? team.map(member => (
          <div className="team-modal-member" key={member.id}>
            <MemberAvatar member={member} />
            <div><strong>{member.name}</strong><small>{member.email ? `${member.email} · ${member.joinedAt ? 'Cuenta activada' : 'Invitación pendiente'}` : 'Perfil antiguo sin correo'}</small></div>
            <span>{tasks.filter(task => task.assigneeId === member.id).length} tareas</span>
          </div>
        )) : <div className="empty-state"><Users size={24} /> Todavía no hay participantes.</div>}
      </div>
      <div className="modal-buttons"><button className="btn btn-outline" onClick={onClose}>Cerrar</button>{onAddMember && <button className="btn btn-primary" onClick={onAddMember}><Plus size={16} /> Invitar integrante</button>}</div>
    </ModalShell>
  );
}
