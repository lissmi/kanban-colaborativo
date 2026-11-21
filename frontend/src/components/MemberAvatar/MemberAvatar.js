import React from 'react';
import './MemberAvatar.css';

// Avatar compartido: si la persona eligió un emoji, sustituimos sus iniciales.
export default function MemberAvatar({ member, small = false, className = '' }) {
  const name = member?.name || 'Sin nombre';
  const initials = name.trim().split(/\s+/).slice(0, 2).map(part => part[0] || '').join('').toUpperCase() || '?';
  const icon = member?.icon || '';
  const color = member?.color || 'blue';
  return (
    <span
      className={`avatar avatar--${color} ${small ? 'avatar--small' : ''} ${icon ? 'avatar--emoji' : ''} ${className}`.trim()}
      title={name}
      aria-label={`Avatar de ${name}`}
    >
      {icon || initials}
    </span>
  );
}
