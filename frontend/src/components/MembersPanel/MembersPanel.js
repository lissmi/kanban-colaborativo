import React from 'react';
import { Users, Plus, ArrowUpRight, HeartHandshake, CalendarDays } from 'lucide-react';
import { formatDate } from '../../utils/board';
import MemberAvatar from '../MemberAvatar/MemberAvatar';
import './MembersPanel.css';

export default function MembersPanel({ project, members, tasks, onAddMember }) {
  const team = members.filter(member => project.memberIds.includes(member.id));
  const upcoming = tasks.filter(task => task.status !== 'done' && task.dueDate).sort((a, b) => a.dueDate.localeCompare(b.dueDate)).slice(0, 3);

  return (
    <aside className="members-panel">
      <section className="panel-box">
        <div className="panel-title"><h3><Users size={16} /> Nuestro equipo</h3>{onAddMember && <button className="btn-icon" title="Invitar participante" aria-label="Invitar participante" onClick={onAddMember}><Plus size={16} /></button>}</div>
        <p className="panel-subtitle">Pequeño equipo, grandes ideas 💜</p>
        <div className="member-list">
          {team.map(member => (
            <div className="member-item" key={member.id}><MemberAvatar member={member} /><div><b>{member.name}</b><small>{tasks.filter(t => t.assigneeId === member.id && t.status !== 'done').length} tareas activas</small></div><span className="member-online" title={member.joinedAt ? 'Cuenta vinculada con Google' : 'Invitación pendiente'} style={!member.joinedAt ? { background: '#e7b76e' } : undefined} /></div>
          ))}
        </div>
        {onAddMember && <button className="panel-add" onClick={onAddMember}><Plus size={15} /> Invitar integrante</button>}
      </section>
      <section className="panel-box">
        <div className="panel-title"><h3><CalendarDays size={16} /> Próximas entregas</h3><ArrowUpRight size={16} color="#bab7cc" /></div>
        {upcoming.length ? upcoming.map(task => (
          <div className="upcoming-item" key={task.id}><span className="upcoming-dot" /><div><b>{task.title}</b><small>{formatDate(task.dueDate)}</small></div></div>
        )) : <p className="panel-subtitle">Sin entregas próximas. ¡Todo al día!</p>}
      </section>
      <div className="panel-motivation"><HeartHandshake size={24} /><strong>¡Vamos súper bien!</strong><span>Organizarse también puede ser bonito. Celebren cada tarea completada ✨</span><span className="panel-spark">✿</span></div>
    </aside>
  );
}
