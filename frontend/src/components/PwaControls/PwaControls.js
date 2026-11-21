import React, { useEffect, useState } from 'react';
import { Bell, BellOff, Check, Download, Smartphone, X, Send, Settings2 } from 'lucide-react';
import { api } from '../../services/api';
import { getBrowserSubscription, isInstalled, pushSupported, subscribePush, unsubscribePush } from '../../services/pushClient';
import { canInstallDirectly, onInstallAvailabilityChange, openNativeInstallDialog } from '../../services/installPrompt';
import './PwaControls.css';

const DEFAULTS = { reminderFrequency: '12h', statusChanges: true, priorityAlerts: true, timeZone: 'America/Santiago' };

export default function PwaControls() {
  const [installReady, setInstallReady] = useState(canInstallDirectly);
  const [installing, setInstalling] = useState(false);
  const [installed, setInstalled] = useState(isInstalled);
  const [instructions, setInstructions] = useState(false);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(false);
  const [settings, setSettings] = useState(DEFAULTS);
  const [publicKey, setPublicKey] = useState('');
  const [configured, setConfigured] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    // El evento se captura globalmente incluso antes del login con Google.
    // Este componente se limita a reaccionar a su disponibilidad.
    const updateAvailability = () => {
      setInstallReady(canInstallDirectly());
      setInstalled(isInstalled());
    };
    const unsubscribe = onInstallAvailabilityChange(updateAvailability);
    window.addEventListener('appinstalled', updateAvailability);
    updateAvailability();
    return () => {
      unsubscribe();
      window.removeEventListener('appinstalled', updateAvailability);
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    // Cargamos solo la clave pública y los ajustes propios; no hacemos ninguna suscripción automática.
    async function readConfig() {
      try {
        const result = await api('/notifications/config');
        const current = await getBrowserSubscription().catch(() => null);
        let linkedToUser = Boolean(current) && Notification.permission === 'granted';
        // Al reabrir, reparar el registro MongoDB de un dispositivo ya suscrito.
        // No se solicita permiso ni se crea una suscripción nueva automáticamente.
        if (linkedToUser && result.enabled) {
          try {
            await api('/notifications/subscription', {
              method: 'POST', body: { subscription: current.toJSON() },
            });
          } catch (error) {
            linkedToUser = false;
            if (mounted) setMessage(`No se pudo sincronizar Push: ${error.message}`);
          }
        }
        if (mounted) {
          setSettings(result.preferences || DEFAULTS);
          setPublicKey(result.vapidPublicKey || '');
          setConfigured(Boolean(result.enabled));
          setActive(linkedToUser);
        }
      } catch (error) { if (mounted) setMessage(error.message); }
    }
    readConfig();
    return () => { mounted = false; };
  }, []);

  async function install() {
    // No simulamos la instalación: solicitamos el diálogo NATIVO del navegador.
    if (installing) return;
    setInstalling(true);
    try {
      // openNativeInstallDialog invoca prompt() durante este mismo clic.
      const result = await openNativeInstallDialog();
      if (result === 'installed') setInstalled(true);
      // 'accepted' se confirma mediante appinstalled cuando Chrome termine.
      if (result === 'unavailable') setInstructions(true);
    } catch (error) {
      // Cancelar la instalación es una decisión válida del usuario.
      if (error.name !== 'AbortError') {
        console.warn('[PWA] Instalación no disponible:', error.message);
        setInstructions(true);
      }
    } finally {
      setInstallReady(canInstallDirectly());
      setInstalling(false);
    }
  }

  async function enable() {
    if (busy) return;
    // En iPhone primero hay que abrir la PWA instalada para solicitar permisos.
    if (/iPhone|iPad|iPod/i.test(navigator.userAgent) && !isInstalled()) {
      setMessage('En iPhone, instala primero Kanban desde Safari: Compartir → Añadir a pantalla de inicio.');
      setInstructions(true);
      return;
    }
    setBusy(true);
    setMessage('');
    try {
      await subscribePush(publicKey);
      const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Santiago';
      const result = await api('/notifications/preferences', { method: 'PATCH', body: { timeZone } });
      setSettings(result.preferences || { ...settings, timeZone });
      setActive(true);
      setMessage('¡Avisos activados en este dispositivo! 🌸');
    } catch (error) { setMessage(error.message); }
    finally { setBusy(false); }
  }

  async function disable() {
    if (busy) return;
    setBusy(true);
    setMessage('');
    try {
      await unsubscribePush();
      setActive(false);
      setMessage('Avisos desactivados en este dispositivo.');
    } catch (error) { setActive(false); setMessage(`Avisos locales desactivados. ${error.message}`); }
    finally { setBusy(false); }
  }

  async function update(field, value) {
    if (busy) return;
    setBusy(true);
    setMessage('');
    try {
      const result = await api('/notifications/preferences', { method: 'PATCH', body: { [field]: value } });
      setSettings(result.preferences);
      setMessage('Preferencias guardadas ✨');
    } catch (error) { setMessage(error.message); }
    finally { setBusy(false); }
  }

  async function testPush() {
    if (busy) return;
    setBusy(true);
    setMessage('');
    try {
      const result = await api('/notifications/test', { method: 'POST' });
      setMessage(result.acceptedByPushService
        ? 'El servicio Push aceptó la prueba. Revisa tus notificaciones. 🌸'
        : 'No se pudo entregar la notificación al proveedor Push.');
    } catch (error) { setMessage(error.message); }
    finally { setBusy(false); }
  }

  useEffect(() => {
    if (!open && !instructions) return undefined;
    const onEscape = event => {
      if (event.key === 'Escape') { setOpen(false); setInstructions(false); }
    };
    window.addEventListener('keydown', onEscape);
    return () => window.removeEventListener('keydown', onEscape);
  }, [open, instructions]);

  const supported = pushSupported();
  const scheduleText = settings.reminderFrequency === '6h'
    ? '09:00, 15:00 y 21:00'
    : settings.reminderFrequency === '24h' ? '09:00'
      : settings.reminderFrequency === 'off' ? 'Desactivados' : '09:00 y 21:00';
  return (
    <div className="kb-pwa-controls">
      <div className="kb-pwa-buttons">
        {!installed && installReady && (
          <button type="button" onClick={install} disabled={installing}
            className="sidebar-link kb-pwa-install" aria-label="Instalar Kanban en este dispositivo">
            <Download size={16} /> {installing ? 'Abriendo instalación...' : 'Instalar app'}
          </button>
        )}
        {!installed && !installReady && (
          <button type="button" onClick={() => setInstructions(true)}
            className="sidebar-link kb-pwa-install" aria-label="Ver opciones para instalar Kanban">
            <Smartphone size={16} /> Cómo instalar
          </button>
        )}
        <button type="button" onClick={() => { setOpen(v => !v); setMessage(''); }} className="sidebar-link kb-pwa-bell"
          aria-expanded={open} aria-label="Configurar notificaciones Push">
          {active ? <Bell size={17} /> : <BellOff size={17} />} {active ? 'Avisos activos' : 'Activar avisos'}
        </button>
      </div>

      {instructions && <div className="kb-pwa-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) setInstructions(false); }}>
        <div className="kb-pwa-panel" role="dialog" aria-modal="true" aria-label="Cómo instalar Kanban">
        <button type="button" className="kb-pwa-close" onClick={() => setInstructions(false)} aria-label="Cerrar"><X size={18} /></button>
        <h3><Smartphone size={18} /> Instalar Kanban 🌸</h3>
        <p>Cuando el navegador permita instalar Kanban directamente, verás el botón <b>Instalar app</b> en el menú lateral. Bastará tocarlo y confirmar en el cuadro nativo.</p>
        <p><b>Android:</b> utiliza Chrome sobre HTTPS. Si aún no aparece la instalación directa, visita la página un momento y recárgala. Como alternativa, abre <b>⋮ → Instalar aplicación</b>.</p>
        <p><b>iPhone/iPad:</b> Safari no permite abrir automáticamente el diálogo desde nuestro botón. Pulsa <b>Compartir → Añadir a pantalla de inicio</b> y abre la app instalada para habilitar los avisos.</p>
        <p><b>Computador:</b> Chrome o Edge pueden mostrar la opción de instalar junto a la barra de direcciones.</p>
        </div>
      </div>}

      {open && !instructions && <div className="kb-pwa-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) setOpen(false); }}>
        <div className="kb-pwa-panel" role="dialog" aria-modal="true" aria-label="Mis notificaciones">
        <button type="button" className="kb-pwa-close" onClick={() => setOpen(false)} aria-label="Cerrar"><X size={18} /></button>
        <h3><Settings2 size={18} /> Mis avisos 🌷</h3>
        <p>Recibe notificaciones de tus proyectos, incluso si estás en otro Kanban.</p>
        {!supported && <p role="alert">Las notificaciones requieren HTTPS, un navegador compatible y permiso del teléfono.</p>}
        {supported && !configured && <p role="alert">El backend todavía no tiene configuradas las claves VAPID.</p>}
        <button className="kb-pwa-primary" type="button" disabled={busy || !supported || !configured}
          onClick={active ? disable : enable}>
          {active ? <><BellOff size={16} /> Desactivar en este dispositivo</> : <><Bell size={16} /> Activar notificaciones</>}
        </button>
        <label className="kb-pwa-field">Recordar mis tareas pendientes
          <select value={settings.reminderFrequency} disabled={busy} onChange={event => update('reminderFrequency', event.target.value)}>
            <option value="12h">Cada 12 horas (recomendado)</option>
            <option value="6h">Cada 6 horas (solo de día)</option>
            <option value="24h">Una vez al día</option>
            <option value="off">No recordar</option>
          </select>
        </label>
        <label className="kb-pwa-checkbox"><input type="checkbox" disabled={busy} checked={settings.statusChanges}
          onChange={event => update('statusChanges', event.target.checked)} /> Avisarme cuando cambie el estado de una tarea</label>
        <label className="kb-pwa-checkbox"><input type="checkbox" disabled={busy} checked={settings.priorityAlerts}
          onChange={event => update('priorityAlerts', event.target.checked)} /> Avisarme cuando me asignen una tarea de prioridad alta</label>
        <div className="kb-pwa-actions">
          <button className="kb-pwa-secondary" type="button" onClick={testPush} disabled={busy || !active}>
            <Send size={15} /> Enviar notificación de prueba
          </button>
          {active && <span className="kb-pwa-active"><Check size={14} /> Dispositivo activo</span>}
        </div>
        <p className="kb-pwa-footnote">Horario: {scheduleText} (hora local). Solo se envían si tienes tareas pendientes y el teléfono puede recibirlos.</p>
        {message && <p className="kb-pwa-message" role="status">{message}</p>}
        </div>
      </div>}
    </div>
  );
}
