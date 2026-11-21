// Estados fijos del tablero: mantienen la misma estructura en todas las páginas.
export const STATUSES = [
  { id: 'todo', name: 'Por hacer', dot: 'rose', emoji: '📝' },
  { id: 'doing', name: 'En progreso', dot: 'blue', emoji: '🚀' },
  { id: 'review', name: 'En revisión', dot: 'amber', emoji: '👀' },
  { id: 'done', name: 'Finalizado', dot: 'green', emoji: '✨' },
];

export const PRIORITIES = [
  { id: 'low', name: 'Baja' },
  { id: 'medium', name: 'Media' },
  { id: 'high', name: 'Alta' },
];

// Crea identificadores sencillos para la demo local (la BD generará los definitivos).
export function makeId(prefix = 'id') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// Formatea un día sin depender de la zona UTC del navegador.
export function formatDate(dateText) {
  if (!dateText) return 'Sin fecha';
  const [year, month, day] = dateText.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return new Intl.DateTimeFormat('es-CL', { day: 'numeric', month: 'short' }).format(date);
}

// Utilidad para inicializar fechas de demostración relativas al día actual.
function dateIn(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

export const INITIAL_WORKSPACE = {
  selectedProjectId: 'project_demo',
  members: [
    { id: 'member_1', name: 'Tú', email: '', color: 'lilac' },
    { id: 'member_2', name: 'Mi colega', email: '', color: 'peach' },
  ],
  projects: [
    { id: 'project_demo', name: 'Nuestro primer proyecto', description: 'Un espacio compartido para convertir ideas en logros.', icon: '🌷', color: 'lilac', memberIds: ['member_1', 'member_2'] },
    { id: 'project_second', name: 'Ideas y mejoras', description: 'Todas esas ideas que queremos hacer realidad.', icon: '💡', color: 'peach', memberIds: ['member_1', 'member_2'] },
  ],
  tasks: [
    { id: 'task_1', projectId: 'project_demo', title: 'Definir las funcionalidades', description: 'Acordar qué tendrá la primera versión de nuestro tablero.', status: 'done', priority: 'medium', label: 'Planificación', dueDate: dateIn(-2), assigneeId: 'member_1', subtasks: [{ id: 's1', text: 'Revisar ideas', done: true }, { id: 's2', text: 'Definir alcance', done: true }] },
    { id: 'task_2', projectId: 'project_demo', title: 'Diseñar la interfaz principal', description: 'Crear un tablero limpio con colores suaves y tarjetas intuitivas.', status: 'doing', priority: 'high', label: 'Diseño', dueDate: dateIn(2), assigneeId: 'member_1', subtasks: [{ id: 's3', text: 'Elegir paleta', done: true }, { id: 's4', text: 'Diseñar tarjetas', done: false }, { id: 's5', text: 'Revisar responsive', done: false }] },
    { id: 'task_3', projectId: 'project_demo', title: 'Conectar MongoDB', description: 'Configurar la conexión de Express con nuestra base de datos.', status: 'todo', priority: 'high', label: 'Backend', dueDate: dateIn(4), assigneeId: 'member_2', subtasks: [] },
    { id: 'task_4', projectId: 'project_demo', title: 'Revisar la experiencia de uso', description: 'Validar que el tablero se entienda a primera vista.', status: 'review', priority: 'medium', label: 'Pruebas', dueDate: dateIn(5), assigneeId: 'member_2', subtasks: [] },
    { id: 'task_5', projectId: 'project_demo', title: 'Preparar los iconos y colores', description: 'Elegir detalles que hagan más entretenido trabajar.', status: 'todo', priority: 'low', label: 'Diseño', dueDate: dateIn(7), assigneeId: 'member_1', subtasks: [] },
    { id: 'task_6', projectId: 'project_demo', title: 'Organizar los responsables', description: 'Asignar las primeras tareas a cada participante.', status: 'done', priority: 'low', label: 'Equipo', dueDate: dateIn(-1), assigneeId: 'member_2', subtasks: [] },
    { id: 'task_7', projectId: 'project_second', title: 'Anotar mejoras futuras', description: 'Guardar ideas interesantes para la segunda versión.', status: 'todo', priority: 'low', label: 'Ideas', dueDate: dateIn(8), assigneeId: 'member_1', subtasks: [] },
  ],
};
