import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Plus, SlidersHorizontal, Sparkles } from 'lucide-react';
import confetti from 'canvas-confetti';
import { useWorkspace } from '../context/WorkspaceContext';
import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/Sidebar/Sidebar';
import Topbar from '../components/Topbar/Topbar';
import ProjectHero from '../components/ProjectHero/ProjectHero';
import KanbanBoard from '../components/KanbanBoard/KanbanBoard';
import MembersPanel from '../components/MembersPanel/MembersPanel';
import TaskModal from '../components/TaskModal/TaskModal';
import ProjectModal from '../components/ProjectModal/ProjectModal';
import WorkspaceModal from '../components/WorkspaceModal/WorkspaceModal';
import MemberModal from '../components/MemberModal/MemberModal';
import MemberActions from '../components/MemberActions/MemberActions';
import ProfileModal from '../components/ProfileModal/ProfileModal';
import MemberAvatar from '../components/MemberAvatar/MemberAvatar';
import TeamModal from '../components/TeamModal/TeamModal';
import Toast from '../components/Toast/Toast';
import '../styles/pages/Dashboard.css';

// Pantalla principal. Aquí unimos los componentes y gestionamos los cuadros de diálogo.
export default function Dashboard() {
  const { selectedProject, selectedWorkspace, projectTasks, members, createProject, createWorkspace,
    createMember, resendInvitation, removeProjectMember, refresh,
    upsertTask, moveTask, deleteTask, loading, error } = useWorkspace();
  const { user, updateProfile } = useAuth();
  const isAdmin = selectedWorkspace?.role === 'admin';
  const [search, setSearch] = useState('');
  const [memberFilter, setMemberFilter] = useState('all');
  // Navegación real: cada botón de la barra lateral muestra una vista diferente.
  const [activeView, setActiveView] = useState('home');
  const [taskOpen, setTaskOpen] = useState(false);
  const [activeTask, setActiveTask] = useState(null);
  const [newTaskStatus, setNewTaskStatus] = useState('todo');
  const [projectOpen, setProjectOpen] = useState(false);
  const [workspaceOpen, setWorkspaceOpen] = useState(false);
  const [memberOpen, setMemberOpen] = useState(false);
  const [teamOpen, setTeamOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  // El sidebar se despliega en móviles para acceder también a las herramientas PWA.
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);

  // Filtramos sobre los datos del proyecto seleccionado, sin modificar la lista original.
  const visibleTasks = useMemo(() => projectTasks.filter(task => {
    const term = search.trim().toLocaleLowerCase('es');
    const text = `${task.title} ${task.description} ${task.label}`.toLocaleLowerCase('es');
    const matchesSearch = !term || text.includes(term);
    const matchesMember = memberFilter === 'all' || task.assigneeId === memberFilter;
    return matchesSearch && matchesMember;
  }), [projectTasks, search, memberFilter]);

  // Al cambiar de proyecto, el filtro anterior podría dejar todas las tareas ocultas.
  useEffect(() => { setMemberFilter('all'); setSearch(''); }, [selectedProject?.id]);

  // Limpiamos cualquier temporizador al desmontar el componente.
  useEffect(() => () => window.clearTimeout(toastTimer.current), []);

  function notify(message, happy = false) {
    window.clearTimeout(toastTimer.current);
    setToast({ message, happy });
    toastTimer.current = window.setTimeout(() => setToast(null), 3400);
  }

  function celebrate() {
    // La librería dibuja pequeñas partículas en un canvas sin modificar el DOM de React.
    confetti({ particleCount: 95, spread: 80, origin: { y: 0.65 }, colors: ['#ad95ef', '#f1aace', '#9fe3ce', '#ffd58a', '#9fc6ef'] });
    notify('¡Misión cumplida! Esa tarea merece una celebración 🎉', true);
  }

  function openNewTask(status = 'todo') {
    setActiveTask(null);
    setNewTaskStatus(status);
    setTaskOpen(true);
  }

  function openEditTask(task) {
    setActiveTask(task);
    setTaskOpen(true);
  }

  async function saveTask(data) {
    try {
      const shouldCelebrate = data.status === 'done' && activeTask?.status !== 'done';
      await upsertTask(data); // Confeti solo tras confirmar MongoDB.
      setTaskOpen(false);
      if (shouldCelebrate) celebrate();
      else notify(activeTask ? 'Cambios guardados correctamente ✨' : '¡Nueva tarea creada! 📝');
    } catch (failure) { notify(`No se guardó: ${failure.message}`); }
  }

  async function handleMoveTask(taskId, nextStatus) {
    const task = projectTasks.find(item => item.id === taskId);
    if (!task || task.status === nextStatus) return;
    try {
      await moveTask(taskId, nextStatus);
      if (nextStatus === 'done') celebrate();
      else notify('Tarea movida correctamente ✨');
    } catch (failure) { notify(`No se movió: ${failure.message}`); }
  }

  async function handleDeleteTask(taskId) {
    try { await deleteTask(taskId); setTaskOpen(false); notify('Tarea eliminada'); }
    catch (failure) { notify(`No se eliminó: ${failure.message}`); }
  }

  // El dueño de un Kanban nuevo recibe rol admin allí, sin cambiar otros roles.
  async function handleCreateWorkspace(name) {
    await createWorkspace(name);
    setWorkspaceOpen(false);
    setActiveView('home');
    notify('¡Tu nuevo Kanban está listo! 🌸');
  }

  async function handleCreateProject(data) {
    try { await createProject(data); setProjectOpen(false); notify('¡Proyecto creado! Ahora podemos organizarlo 💜'); }
    catch (failure) { notify(`No se creó el proyecto: ${failure.message}`); }
  }

  async function handleCreateMember(data) {
    try {
      await createMember(data);
      setMemberOpen(false);
      notify('¡Invitación enviada automáticamente por correo! 💌');
    } catch (failure) {
      await refresh({ silent: true }); // Puede haberse guardado el integrante aunque falle Gmail.
      notify(`No se completó el envío: ${failure.message}`);
    }
  }

  // Envía una invitación nueva sin duplicar el integrante en MongoDB.
  async function handleResendInvitation(member) {
    try {
      const result = await resendInvitation(member.id);
      if (result.emailSent) notify(`Gmail aceptó el envío a ${member.email} 💌`);
    } catch (failure) { notify(`No se pudo reenviar: ${failure.message}`); }
  }

  // Confirmamos antes de revocar el acceso a este proyecto.
  async function handleRemoveMember(member) {
    if (!window.confirm(`¿Quitar a ${member.name} de «${selectedProject.name}»? Sus tareas quedarán sin asignar.`)) return;
    try {
      await removeProjectMember(member.id);
      notify(`${member.name} ya no tiene acceso a este proyecto.`);
    } catch (failure) { notify(`No se pudo quitar: ${failure.message}`); }
  }

  // Actualiza el perfil propio en MongoDB y sincroniza todas las tarjetas/avatares.
  async function handleSaveProfile(data) {
    await updateProfile(data);
    await Promise.resolve(refresh({ silent: true })).catch(() => {});
    setProfileOpen(false);
    notify('¡Tu perfil quedó actualizado! 🌸');
  }

  function openNewMember() {
    setTeamOpen(false);
    setMemberOpen(true);
  }

  const team = members.filter(member => selectedProject?.memberIds.includes(member.id));

  // Al ingresar por primera vez MongoDB puede no tener proyectos todavía.
  if (loading) return <div className="dashboard-shell"><main className="dashboard-main"><p style={{ padding: 36 }}>Cargando proyectos desde MongoDB... 🌸</p></main></div>;
  if (!selectedProject) return (
    <div className="dashboard-shell">
      <Sidebar activeView={activeView} onNavigate={setActiveView} onNewProject={() => setProjectOpen(true)} onNewWorkspace={() => setWorkspaceOpen(true)} onOpenMembers={() => setActiveView('members')} onOpenProfile={() => setProfileOpen(true)} mobileOpen={mobileMenuOpen} onCloseMobile={() => setMobileMenuOpen(false)} />
      <main className="dashboard-main">
        <Topbar search={search} setSearch={setSearch} onNewTask={() => setActiveView('board')} onOpenMembers={() => setActiveView('members')} onOpenProfile={() => setProfileOpen(true)} onNewWorkspace={() => setWorkspaceOpen(true)} onOpenMobileMenu={() => setMobileMenuOpen(true)} />
        <div className="dashboard-content" style={{ padding: 32 }}>
          <h2>{error ? 'No se pudo cargar MongoDB' : activeView === 'members' ? 'Nuestro equipo 💜' : activeView === 'board' ? 'Mi tablero 🗂️' : '¡Comencemos tu primer proyecto! 🌸'}</h2>
          <p>{error || (activeView === 'members' ? 'Aquí aparecerán los participantes cuando exista un proyecto. Primero crea el proyecto para invitar a tu colega.' : isAdmin ? 'Crea un proyecto y empieza a organizar las tareas.' : 'Pide a la persona administradora que te agregue a un proyecto.')}</p>
          {activeView === 'members' && <div className="workspace-team-card"><strong>{user?.name || 'Tu cuenta'}</strong><span>{user?.email || ''}</span><small>{isAdmin ? 'Admin del Kanban' : 'Member del Kanban'} · Google</small></div>}
          {isAdmin && <button className="btn btn-primary" onClick={() => setProjectOpen(true)}>Crear primer proyecto</button>}
        </div>
      </main>
      {workspaceOpen && <WorkspaceModal onSave={handleCreateWorkspace} onClose={() => setWorkspaceOpen(false)} />}
      {projectOpen && <ProjectModal members={members} onSave={handleCreateProject} onClose={() => setProjectOpen(false)} />}
      {profileOpen && <ProfileModal user={user} onSave={handleSaveProfile} onClose={() => setProfileOpen(false)} />}
      <Toast message={toast?.message} happy={toast?.happy} />
    </div>
  );

  return (
    <div className="dashboard-shell">
      <Sidebar activeView={activeView} onNavigate={setActiveView} onNewProject={() => setProjectOpen(true)} onNewWorkspace={() => setWorkspaceOpen(true)} onOpenMembers={() => setActiveView('members')} onOpenProfile={() => setProfileOpen(true)} mobileOpen={mobileMenuOpen} onCloseMobile={() => setMobileMenuOpen(false)} />
      <main className="dashboard-main">
        <Topbar search={search} setSearch={setSearch} onNewTask={() => { setActiveView('board'); openNewTask(); }} onOpenMembers={() => setActiveView('members')} onOpenProfile={() => setProfileOpen(true)} onNewWorkspace={() => setWorkspaceOpen(true)} onOpenMobileMenu={() => setMobileMenuOpen(true)} />
        <div className="dashboard-content">
          {activeView === 'members' ? (
            <section className="workspace-team-page">
              <span className="board-eyebrow">💜 ESPACIO COLABORATIVO</span>
              <h1>Participantes del proyecto</h1>
              <p>Personas que pueden colaborar en «{selectedProject.name}».</p>
              <div className="workspace-team-list">
                {team.map(member => (
                  <div className="workspace-team-card" key={member.id}>
                    <MemberAvatar member={member} />
                    <div><strong>{member.name}</strong><small>{member.email || 'Sin correo'}</small></div>
                    <span className="workspace-member-status">{member.joinedAt ? 'Cuenta vinculada' : 'Invitación pendiente'}</span>
                    {isAdmin && member.id !== user?.id && (
                      <MemberActions member={member} onResend={handleResendInvitation} onRemove={handleRemoveMember} />
                    )}
                  </div>
                ))}
              </div>
              {isAdmin && <button type="button" className="btn btn-primary" onClick={openNewMember}><Plus size={16} /> Invitar integrante</button>}
            </section>
          ) : (
          <>
          {activeView === 'home' && <ProjectHero project={selectedProject} tasks={projectTasks} />}
          <div className="dashboard-lower">
            <section className="dashboard-board" id="tablero">
              <div className="board-toolbar">
                <div><span className="board-eyebrow"><Sparkles size={13} /> DONDE SUCEDE LA MAGIA</span><h2>Tablero de tareas <span className="board-bloom">✿</span></h2><p>Un pasito a la vez, ¡vamos a lograrlo!</p></div>
                <div className="board-controls"><label className="filter-field"><SlidersHorizontal size={14} /><select aria-label="Filtrar tareas por responsable" value={memberFilter} onChange={event => setMemberFilter(event.target.value)}><option value="all">Todos</option>{team.map(member => <option value={member.id} key={member.id}>{member.name}</option>)}</select></label><button className="btn btn-outline board-create" onClick={() => openNewTask()}><Plus size={15} /> Añadir tarea</button></div>
              </div>
              <KanbanBoard tasks={visibleTasks} members={members} search={search} onNewTask={openNewTask} onEditTask={openEditTask} onMoveTask={handleMoveTask} />
              <p className="board-hint">💡 Tip: arrastra una tarjeta a otra columna para cambiar su estado. También puedes hacer clic para editarla.</p>
            </section>
            <MembersPanel project={selectedProject} members={members} tasks={projectTasks} onAddMember={isAdmin ? openNewMember : null} />
          </div>
          </>
          )}
          <footer className="dashboard-footer">Hecho con 💜 para que organizarse también sea divertido <span>kanban 🌸 · Conectado a MongoDB</span></footer>
        </div>
      </main>

      {taskOpen && <TaskModal key={activeTask?.id || 'new-task'} task={activeTask} initialStatus={newTaskStatus} members={members} project={selectedProject} onSave={saveTask} onDelete={handleDeleteTask} onClose={() => setTaskOpen(false)} />}
      {workspaceOpen && <WorkspaceModal onSave={handleCreateWorkspace} onClose={() => setWorkspaceOpen(false)} />}
      {projectOpen && <ProjectModal members={members} onSave={handleCreateProject} onClose={() => setProjectOpen(false)} />}
      {teamOpen && <TeamModal project={selectedProject} members={members} tasks={projectTasks} onAddMember={isAdmin ? openNewMember : null} onClose={() => setTeamOpen(false)} />}
      {memberOpen && isAdmin && <MemberModal onSave={handleCreateMember} onClose={() => setMemberOpen(false)} />}
      {profileOpen && <ProfileModal user={user} onSave={handleSaveProfile} onClose={() => setProfileOpen(false)} />}
      <Toast message={toast?.message} happy={toast?.happy} />
    </div>
  );
}
