import React from 'react';
import { Search, Plus, Sparkles, LogOut, UserRound, Menu } from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useAuth } from '../../context/AuthContext';
import ThemeToggle from '../ThemeToggle/ThemeToggle';
import MemberAvatar from '../MemberAvatar/MemberAvatar';
import './Topbar.css';
import './WorkspaceSwitcherMobile.css';

export default function Topbar({ search, setSearch, onNewTask, onOpenMembers, onOpenProfile, onNewWorkspace, onOpenMobileMenu }) {
  const { selectedProject, selectedWorkspace, selectedWorkspaceId, spaces, selectWorkspace, members } = useWorkspace();
  const { user, logout } = useAuth();
  const projectMembers = members.filter(member => selectedProject?.memberIds.includes(member.id));
  return (
    <header className="topbar">
      <div className="breadcrumbs"><span>{selectedWorkspace?.name || 'Mi Kanban'}</span><span className="breadcrumbs-slash">/</span><strong>{selectedProject?.name || 'Mis proyectos'}</strong></div>
      {/* En móvil no aparece Sidebar: este selector permite cambiar de Kanban en la PWA. */}
      <div className="kb-mobile-spaces">
        <label htmlFor="kb-mobile-space">Mi Kanban</label>
        <select id="kb-mobile-space" value={selectedWorkspaceId || ''}
          onChange={event => selectWorkspace(event.target.value).catch(error => window.alert(error.message))}>
          {spaces.map(space => <option key={space.id} value={space.id}>{space.name} · {space.role}</option>)}
        </select>
        <button type="button" onClick={onNewWorkspace} aria-label="Crear nuevo Kanban" title="Crear nuevo Kanban">+</button>
      </div>
      <div className={`topbar-actions ${selectedProject ? '' : 'topbar-actions--no-project'}`}>
        <ThemeToggle />
        <button className="btn btn-outline kb-topbar-profile" type="button" onClick={onOpenProfile} title="Editar mi perfil">
          <UserRound size={16} /> <span>Mi perfil</span>
        </button>
        {selectedProject && <label className="search-field"><Search size={17} /><input aria-label="Buscar tareas" type="search" placeholder="Buscar una tarea..." value={search} onChange={event => setSearch(event.target.value)} /><kbd>⌕</kbd></label>}
        {selectedProject && <button className="topbar-team" onClick={onOpenMembers} title="Ver participantes">
          {projectMembers.slice(0, 3).map(member => <MemberAvatar key={member.id} member={member} small />)}
          <span className="topbar-team-plus">+</span>
        </button>}
        {selectedProject && <button className="btn btn-primary topbar-create" onClick={onNewTask}><Plus size={17} /> Nueva tarea</button>}
        <button className="btn btn-outline kb-topbar-logout" type="button" title={`Cerrar sesión de ${user?.email}`} onClick={logout}><LogOut size={16} /><span>Salir</span></button>
      </div>
      <div className="mobile-topbar-brand">
        <button type="button" className="kb-sidebar-open-button" onClick={onOpenMobileMenu}
          aria-label="Abrir menú lateral" aria-controls="kanban-sidebar">
          <Menu size={22} />
        </button>
        <Sparkles size={19} /> kanban🌸
      </div>
    </header>
  );
}
