import React from 'react';
import { CheckCircle2, Sparkles } from 'lucide-react';
import './Toast.css';

// Mensaje breve para confirmar una acción sin interrumpir el trabajo.
export default function Toast({ message, happy = false }) {
  if (!message) return null;
  return <div role="status" className="toast-message">{happy ? <Sparkles size={17} /> : <CheckCircle2 size={17} />}<span>{message}</span></div>;
}
