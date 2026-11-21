import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { api, session } from '../services/api';

const WorkspaceContext = createContext(null);

export function WorkspaceProvider({ children }) {
  const [workspace, setWorkspace] = useState({ projects: [], members: [], tasks: [] });
  const [spaces, setSpaces] = useState([]);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState(() => session.getWorkspace());
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const requestId = useRef(0);
  const handledInviteLink = useRef(false);

  // Carga la lista de Kanban y SOLO los datos del espacio autorizado.
  const refresh = useCallback(async ({ silent = false, workspaceId } = {}) => {
    const request = ++requestId.current;
    try {
      const result = await api('/spaces');
      const list = result.spaces || [];
      if (request !== requestId.current) return;
      // Si entró desde un correo, se prioriza ese espacio la primera vez.
      const linkParams = !handledInviteLink.current ? new URLSearchParams(window.location.search) : null;
      const fromInvitation = linkParams?.get('workspace') || null;
      // Al abrir una notificación, seleccionamos también el proyecto indicado en la URL.
      const fromPushProject = linkParams?.get('project') || null;
      handledInviteLink.current = true;
      const wished = workspaceId || fromInvitation || session.getWorkspace();
      const activeId = list.some(space => space.id === wished) ? wished : list[0]?.id || '';
      setSpaces(list);
      setSelectedWorkspaceId(activeId);
      if (!activeId) {
        setWorkspace({ projects: [], members: [], tasks: [] });
        setSelectedProjectId(null);
        setError('No tienes Kanban disponibles');
        return;
      }
      session.setWorkspace(activeId);
      const data = await api('/workspace');
      if (request !== requestId.current) return;
      setWorkspace(data);
      setSelectedProjectId(current =>
        fromPushProject && data.projects.some(project => project.id === fromPushProject)
          ? fromPushProject
          : data.projects.some(project => project.id === current)
            ? current : data.projects[0]?.id || null);
      setError('');
    } catch (failure) {
      if (request !== requestId.current) return;
      setError(failure.message);
      if (!silent) throw failure;
    } finally {
      if (request === requestId.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Conservamos la referencia al contador de solicitudes.
    const requestCounter = requestId;

    // Cargamos inicialmente los datos del Kanban.
    refresh({ silent: true });

    // Actualizamos la información cada 10 segundos.
    const interval = window.setInterval(() => {
      refresh({ silent: true });
    }, 10000);

    // Limpiamos los recursos cuando se desmonta el componente.
    return () => {
      // Detenemos la actualización automática.
      window.clearInterval(interval);

      // Invalidamos solicitudes anteriores que todavía estén pendientes.
      requestCounter.current += 1;
    };
  }, [refresh]);

  const selectedWorkspace = useMemo(() =>
    spaces.find(space => space.id === selectedWorkspaceId) || null,
    [spaces, selectedWorkspaceId]);
  const selectedProject = useMemo(() =>
    workspace.projects.find(project => project.id === selectedProjectId) || null,
    [workspace.projects, selectedProjectId]);
  const projectTasks = useMemo(() =>
    workspace.tasks.filter(task => task.projectId === selectedProject?.id),
    [workspace.tasks, selectedProject]);

  // Cambiar de espacio NO crea una segunda sesión ni modifica la cuenta Google.
  async function selectWorkspace(id) {
    if (!spaces.some(space => space.id === id)) throw new Error('No tienes acceso a este Kanban');
    setSelectedProjectId(null);
    session.setWorkspace(id);
    await refresh({ workspaceId: id });
  }
  async function createWorkspace(name) {
    const result = await api('/spaces', { method: 'POST', body: { name } });
    setSelectedProjectId(null);
    session.setWorkspace(result.space.id);
    await refresh({ workspaceId: result.space.id });
    return result.space;
  }
  async function createProject(data) {
    const result = await api('/projects', { method: 'POST', body: data });
    await refresh();
    setSelectedProjectId(result.id);
    return result;
  }
  async function createMember(data) {
    if (!selectedProject) throw new Error('Selecciona un proyecto para invitar personas');
    const result = await api('/members', { method: 'POST', body: { ...data, projectId: selectedProject.id } });
    await refresh();
    return result;
  }
  async function resendInvitation(memberId) {
    if (!selectedProject) throw new Error('Primero selecciona un proyecto');
    const result = await api(`/members/${encodeURIComponent(memberId)}/resend`, {
      method: 'POST', body: { projectId: selectedProject.id },
    });
    await refresh();
    return result;
  }
  async function removeProjectMember(memberId) {
    if (!selectedProject) throw new Error('Primero selecciona un proyecto');
    await api(`/members/${encodeURIComponent(memberId)}/projects/${encodeURIComponent(selectedProject.id)}`, {
      method: 'DELETE',
    });
    await refresh();
  }
  async function upsertTask(data) {
    if (!selectedProject) throw new Error('Primero crea un proyecto');
    const path = data.id ? `/tasks/${encodeURIComponent(data.id)}` : '/tasks';
    const result = await api(path, {
      method: data.id ? 'PATCH' : 'POST', body: { ...data, projectId: selectedProject.id },
    });
    await refresh();
    return result;
  }
  async function moveTask(taskId, status) {
    const result = await api(`/tasks/${encodeURIComponent(taskId)}/status`, {
      method: 'PATCH', body: { status },
    });
    await refresh();
    return result;
  }
  async function deleteTask(taskId) {
    await api(`/tasks/${encodeURIComponent(taskId)}`, { method: 'DELETE' });
    await refresh();
  }
  return <WorkspaceContext.Provider value={{
    ...workspace, spaces, selectedWorkspace, selectedWorkspaceId, selectWorkspace, createWorkspace,
    loading, error, refresh, selectedProject, projectTasks, selectProject: setSelectedProjectId,
    createProject, createMember, resendInvitation, removeProjectMember,
    upsertTask, moveTask, deleteTask,
  }}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace() {
  const value = useContext(WorkspaceContext);
  if (!value) throw new Error('useWorkspace requiere WorkspaceProvider');
  return value;
}
