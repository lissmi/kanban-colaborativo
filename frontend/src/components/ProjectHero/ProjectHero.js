import React from 'react';
import { Sparkles, ArrowUpRight, CheckCircle2, Clock3, Layers } from 'lucide-react';
import './ProjectHero.css';

export default function ProjectHero({ project, tasks }) {
  const total = tasks.length;
  const finished = tasks.filter(task => task.status === 'done').length;
  const inProgress = tasks.filter(task => task.status === 'doing').length;
  const pending = tasks.filter(task => task.status === 'todo' || task.status === 'review').length;
  const progress = total ? Math.round(finished / total * 100) : 0;

  return (
    <section className="hero-wrap" id="resumen">
      <div className="hero-heading"><div><span className="eyebrow"><Sparkles size={13} /> TU RINCÓN PRODUCTIVO</span><h1>¡Hola, equipo! <span>✿</span></h1><p>Hoy es un buen día para avanzar, una tarea a la vez.</p></div><span className="hero-date">✨ Creamos mejor en equipo</span></div>
      <div className="hero-card">
        <div className="hero-art hero-art--one" /><div className="hero-art hero-art--two" />
        <div className="hero-main"><span className="hero-pill">{project.icon} PROYECTO ACTIVO</span><h2>{project.name}</h2><p>{project.description || 'Aquí nacen las ideas que vamos a hacer realidad.'}</p><a href="#tablero" className="hero-go">Ir al tablero <ArrowUpRight size={15} /></a></div>
        <div className="hero-progress"><div className="hero-progress-ring" style={{ '--percent': `${progress}%` }}><strong>{progress}%</strong><span>completado</span></div><span>¡Cada paso cuenta! 💜</span></div>
      </div>
      <div className="stats-row">
        <div className="stat-card"><span className="stat-icon stat-icon--all"><Layers size={21} /></span><div><span>Tareas totales</span><b>{total.toString().padStart(2, '0')}</b></div><span className="stat-decoration">✦</span></div>
        <div className="stat-card"><span className="stat-icon stat-icon--doing"><Clock3 size={21} /></span><div><span>En progreso</span><b>{inProgress.toString().padStart(2, '0')}</b></div><span className="stat-decoration">✧</span></div>
        <div className="stat-card"><span className="stat-icon stat-icon--done"><CheckCircle2 size={21} /></span><div><span>Finalizadas</span><b>{finished.toString().padStart(2, '0')}</b></div><span className="stat-decoration">✦</span></div>
        <div className="stat-card"><span className="stat-icon stat-icon--pending"><Sparkles size={21} /></span><div><span>Por avanzar</span><b>{pending.toString().padStart(2, '0')}</b></div><span className="stat-decoration">✧</span></div>
      </div>
    </section>
  );
}
