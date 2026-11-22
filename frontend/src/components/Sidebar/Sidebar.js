import React from 'react';
import { LayoutDashboard, FolderKanban, Users, Plus, Sparkles, Heart, FolderPlus, UserRound, Crown, X, Pencil, Trash2 } from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useAuth } from '../../context/AuthContext';
import MemberAvatar from '../MemberAvatar/MemberAvatar';
import PwaControls from '../PwaControls/PwaControls';
import './Sidebar.css';
import './WorkspaceSwitcher.css';
import './PwaSidebarMobile.css';
import '../management/Management.css';

// La lista de proyectos cambia al seleccionar un Kanban; nunca se mezclan espacios.
export default function Sidebar({ onNewProject, onNewWorkspace, onEditProject, onDeleteProject, onEditWorkspace, onDeleteWorkspace, onOpenProfile, activeView = 'home', onNavigate = () => {}, mobileOpen = false, onCloseMobile = () => {} }) {
  const { projects, selectedProject, selectProject, members,
    spaces, selectedWorkspace, selectedWorkspaceId, selectWorkspace } = useWorkspace();
  const { user } = useAuth();
  const isAdmin = selectedWorkspace?.role === 'admin';

  function switchTo(id) {
    onNavigate('home');
    onCloseMobile();
    selectWorkspace(id).catch(error => window.alert(`No se pudo cambiar de Kanban: ${error.message}`));
  }
  return (
    <>
      {/* El fondo oscuro permite cerrar el menú al tocar fuera de él. */}
      {mobileOpen && <button type="button" className="kb-sidebar-backdrop"
        onClick={onCloseMobile} aria-label="Cerrar menú lateral" />}
      <aside id="kanban-sidebar" className={`sidebar ${mobileOpen ? 'kb-sidebar-open' : ''}`}>
        <button type="button" className="kb-sidebar-close" onClick={onCloseMobile} aria-label="Cerrar menú">
          <X size={20} />
        </button>
      <div className="sidebar-brand">
        <span className="brand-flower">✿</span>
        <div className="brand-text">kanban<span>🌸</span><small>your happy workspace</small></div>
      </div>
      <div className="sidebar-workspace kb-workspace-panel">
        <div className="kb-workspace-top"><span className="workspace-icon">🌷</span>
          <div className="workspace-copy"><b>Mis Kanban</b><small>{spaces.length} espacio(s)</small></div></div>
        <label className="kb-switch-label" htmlFor="kb-select-workspace">Espacio activo</label>
        <select id="kb-select-workspace" className="kb-workspace-select"
          value={selectedWorkspaceId || ''} onChange={event => switchTo(event.target.value)}>
          {spaces.map(space => <option key={space.id} value={space.id}>{space.name} · {space.role === 'admin' ? 'Admin' : 'Member'}</option>)}
        </select>
        <div className="kb-workspace-bottom">
          <span className="kb-workspace-role"><Crown size={13} /> {isAdmin ? 'Administras este Kanban' : 'Participas como miembro'}</span>
          <button type="button" className="kb-new-workspace" onClick={onNewWorkspace} title="Crear otro Kanban"><Plus size={14} /> Nuevo</button>
        </div>
        {isAdmin && <div className="kb-workspace-admin-actions">
          <button type="button" onClick={() => { onEditWorkspace(); onCloseMobile(); }} title="Cambiar nombre del Kanban"><Pencil size={13} /> Editar Kanban</button>
          {!selectedWorkspace?.isPersonal && selectedWorkspace?.createdBy === user?.id &&
            <button type="button" className="kb-danger" onClick={() => { onDeleteWorkspace(); onCloseMobile(); }} title="Eliminar este Kanban"><Trash2 size={13} /> Eliminar</button>}
        </div>}
      </div>
      <div className="sidebar-section">
        <span className="sidebar-heading">ESPACIO DE TRABAJO</span>
        <button type="button" className={`sidebar-link ${activeView === 'home' ? 'sidebar-link--selected' : ''}`} onClick={() => { onNavigate('home'); onCloseMobile(); }}><LayoutDashboard size={17} /> Inicio</button>
        <button type="button" className={`sidebar-link ${activeView === 'board' ? 'sidebar-link--selected' : ''}`} onClick={() => { onNavigate('board'); onCloseMobile(); }}><FolderKanban size={17} /> Mi tablero</button>
        <button type="button" className={`sidebar-link ${activeView === 'members' ? 'sidebar-link--selected' : ''}`} onClick={() => { onNavigate('members'); onCloseMobile(); }}><Users size={17} /> Participantes <span className="sidebar-count">{members.length}</span></button>
        <button type="button" className="sidebar-link" onClick={() => { onOpenProfile(); onCloseMobile(); }}><UserRound size={17} /> Mi perfil</button>
      </div>
      <div className="sidebar-section sidebar-projects">
        <div className="sidebar-heading-row">
          <span className="sidebar-heading">PROYECTOS EN ESTE KANBAN</span>
          {isAdmin && <button type="button" className="sidebar-mini-add" onClick={onNewProject} title="Crear proyecto"><Plus size={17} /></button>}
        </div>
        {projects.map(project => (
          <div className="kb-project-manage-row" key={project.id}>
            <button type="button"
              className={`sidebar-project kb-project-select ${selectedProject?.id === project.id ? 'sidebar-project--active' : ''}`}
              onClick={() => { selectProject(project.id); onNavigate('home'); onCloseMobile(); }}>
              <span className={`sidebar-project-icon tint-${project.color}`}>{project.icon}</span>
              <span className="sidebar-project-name">{project.name}</span>
              {selectedProject?.id === project.id && <span className="project-selected-dot" />}
            </button>
            {isAdmin && <div className="kb-project-manage-buttons">
              <button type="button" aria-label={`Editar proyecto ${project.name}`} title="Editar proyecto"
                onClick={() => { onEditProject(project); onCloseMobile(); }}><Pencil size={14} /></button>
              <button type="button" className="kb-danger" aria-label={`Eliminar proyecto ${project.name}`} title="Eliminar proyecto"
                onClick={() => { onDeleteProject(project); onCloseMobile(); }}><Trash2 size={14} /></button>
            </div>}
          </div>
        ))}
        {isAdmin && <button type="button" className="sidebar-add-project" onClick={onNewProject}><FolderPlus size={16} /> Nuevo proyecto</button>}
      </div>
      {/* Herramientas de la aplicación, visibles para admin y member. */}
      <div className="kb-sidebar-app-section">
        <span className="sidebar-heading">APLICACIÓN</span>
        <PwaControls />
      </div>
      <div className="sidebar-bottom">
        <div className="sidebar-quote"><Sparkles size={17} /> <span>Los pequeños avances también merecen celebrarse.</span><Heart size={14} fill="#edb6c9" color="#edb6c9" /></div>
        <div className="sidebar-footer"><MemberAvatar member={user} /><span><b>{user?.name || 'Mi cuenta'}</b><small>¡A crear cosas bonitas!</small></span></div>
      </div>
      </aside>
    </>
  );
}
