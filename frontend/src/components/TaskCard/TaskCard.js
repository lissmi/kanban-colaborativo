import React from 'react';
import { Calendar, GripVertical, ListTodo } from 'lucide-react';
import { formatDate } from '../../utils/board';
import MemberAvatar from '../MemberAvatar/MemberAvatar';
import './TaskCard.css';

export default function TaskCard({ task, member, onEdit, onDragStart, onDragEnd }) {
  const completed = task.subtasks.filter(subtask => subtask.done).length;
  const total = task.subtasks.length;
  const percentage = total ? Math.round(completed / total * 100) : 0;

  return (
    <article
      className="task-card"
      draggable="true"
      onDragStart={event => onDragStart(event, task.id)}
      onDragEnd={onDragEnd}
      onClick={() => onEdit(task)}
      onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onEdit(task); } }}
      tabIndex={0}
      role="button"
      aria-label={`Editar tarea ${task.title}`}
    >
      <div className="task-card-top"><span className="task-label">{task.label || 'General'}</span><GripVertical size={15} aria-hidden="true" /></div>
      <h4>{task.title}</h4>
      {task.description && <p className="task-description">{task.description}</p>}
      {total > 0 && (
        <div className="task-checklist">
          <div className="task-checklist-top"><span><ListTodo size={12} /> Subtareas</span><b>{completed}/{total}</b></div>
          <div className="task-meter"><span style={{ width: `${percentage}%` }} /></div>
        </div>
      )}
      <div className="task-card-footer">
        <span className={`priority-chip priority-${task.priority}`}><i />{task.priority === 'high' ? 'Alta' : task.priority === 'low' ? 'Baja' : 'Media'}</span>
        <span className="task-due"><Calendar size={12} />{formatDate(task.dueDate)}</span>
        <MemberAvatar member={member} small />
      </div>
    </article>
  );
}
