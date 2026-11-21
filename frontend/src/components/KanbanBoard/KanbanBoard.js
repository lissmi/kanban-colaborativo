import React, { useState } from 'react';
import { Plus, SearchX, Sparkles } from 'lucide-react';
import { STATUSES } from '../../utils/board';
import TaskCard from '../TaskCard/TaskCard';
import './KanbanBoard.css';

export default function KanbanBoard({ tasks, members, onNewTask, onEditTask, onMoveTask, search }) {
  const [draggedOver, setDraggedOver] = useState(null);
  const [draggedId, setDraggedId] = useState(null);

  function handleDragStart(event, taskId) {
    // Registramos la tarea arrastrada para identificarla al soltarla.
    event.dataTransfer.setData('text/plain', taskId);
    event.dataTransfer.effectAllowed = 'move';
    setDraggedId(taskId);
  }

  function handleDrop(event, newStatus) {
    event.preventDefault();
    const taskId = event.dataTransfer.getData('text/plain') || draggedId;
    if (taskId) onMoveTask(taskId, newStatus);
    setDraggedOver(null);
    setDraggedId(null);
  }

  return (
    <div className="board-scroller">
      <div className="kanban-columns">
        {STATUSES.map(column => {
          const columnTasks = tasks.filter(task => task.status === column.id);
          return (
            <section
              key={column.id}
              className={`kanban-column kanban-column--${column.dot} ${draggedOver === column.id ? 'kanban-column--dragover' : ''}`}
              onDragOver={event => { event.preventDefault(); event.dataTransfer.dropEffect = 'move'; }}
              onDragEnter={() => setDraggedOver(column.id)}
              onDragLeave={event => { if (!event.currentTarget.contains(event.relatedTarget)) setDraggedOver(null); }}
              onDrop={event => handleDrop(event, column.id)}
            >
              <div className="kanban-column-header"><div><span className="column-dot" /><h3>{column.name}</h3><span className="column-count">{columnTasks.length}</span></div><span className="column-emoji">{column.emoji}</span></div>
              <div className="kanban-task-stack">
                {columnTasks.length ? columnTasks.map(task => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    member={members.find(member => member.id === task.assigneeId)}
                    onEdit={onEditTask}
                    onDragStart={handleDragStart}
                    onDragEnd={() => { setDraggedId(null); setDraggedOver(null); }}
                  />
                )) : (
                  <div className="column-empty"><span>{search ? <SearchX size={26} /> : <Sparkles size={26} />}</span><p>{search ? 'No hay coincidencias' : '¡Espacio para nuevas ideas!'}</p></div>
                )}
                <button className="column-add" onClick={() => onNewTask(column.id)}><Plus size={14} /> Añadir tarea</button>
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
