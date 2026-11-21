const { assert } = require('../utils/errors');

const STATUSES = ['todo', 'doing', 'review', 'done'];
const PRIORITIES = ['low', 'medium', 'high'];
const COLORS = ['lilac', 'peach', 'mint', 'blue', 'pink'];

function isRecord(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}
function text(value, name, limit, required = false) {
  assert(typeof value === 'string', 400, `${name} debe ser un texto`);
  const trimmed = value.trim();
  assert(trimmed.length <= limit, 400, `${name} excede ${limit} caracteres`);
  if (required) assert(trimmed.length > 0, 400, `${name} es obligatorio`);
  return trimmed;
}
function enumValue(value, allowed, name) {
  assert(allowed.includes(value), 400, `${name} no es válido`);
  return value;
}
function idArray(value, name) {
  assert(Array.isArray(value) && value.length <= 50, 400, `${name} debe ser una lista de hasta 50 IDs`);
  value.forEach(id => text(id, `${name}: ID`, 120, true));
  return [...new Set(value)];
}
function optionalId(value, name) {
  return text(value || '', name, 120);
}
function projectInput(payload, partial = false) {
  assert(isRecord(payload), 400, 'El cuerpo debe ser un objeto JSON');
  const out = {};
  if (!partial || payload.name !== undefined) out.name = text(payload.name, 'Nombre', 65, true);
  if (!partial || payload.description !== undefined) out.description = text(payload.description ?? '', 'Descripción', 220);
  if (!partial || payload.icon !== undefined) out.icon = text(payload.icon ?? '🌷', 'Ícono', 24);
  if (!partial || payload.color !== undefined) out.color = enumValue(payload.color ?? 'lilac', COLORS, 'Color');
  if (!partial || payload.memberIds !== undefined) out.memberIds = idArray(payload.memberIds ?? [], 'Participantes');
  return out;
}
function memberInput(payload, partial = false) {
  assert(isRecord(payload), 400, 'El cuerpo debe ser un objeto JSON');
  const out = {};
  if (!partial || payload.name !== undefined) out.name = text(payload.name, 'Nombre', 70, true);
  if (!partial || payload.email !== undefined) {
    out.email = text(payload.email ?? '', 'Correo', 150).toLowerCase();
    assert(!out.email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(out.email), 400, 'Correo no válido');
  }
  if (!partial || payload.color !== undefined) out.color = enumValue(payload.color ?? 'mint', COLORS, 'Color');
  return out;
}
function taskInput(payload, partial = false) {
  assert(isRecord(payload), 400, 'El cuerpo debe ser un objeto JSON');
  const out = {};
  if (!partial || payload.title !== undefined) out.title = text(payload.title, 'Título', 110, true);
  if (!partial || payload.description !== undefined) out.description = text(payload.description ?? '', 'Descripción', 1000);
  if (!partial || payload.status !== undefined) out.status = enumValue(payload.status ?? 'todo', STATUSES, 'Estado');
  if (!partial || payload.priority !== undefined) out.priority = enumValue(payload.priority ?? 'medium', PRIORITIES, 'Prioridad');
  if (!partial || payload.label !== undefined) out.label = text(payload.label ?? 'General', 'Etiqueta', 30);
  if (!partial || payload.dueDate !== undefined) {
    out.dueDate = text(payload.dueDate ?? '', 'Fecha límite', 10);
    assert(!out.dueDate || /^\d{4}-\d{2}-\d{2}$/.test(out.dueDate), 400, 'Fecha límite debe tener formato YYYY-MM-DD');
    if (out.dueDate) {
      const d = new Date(`${out.dueDate}T00:00:00.000Z`);
      assert(!Number.isNaN(d.valueOf()) && d.toISOString().slice(0, 10) === out.dueDate, 400, 'Fecha límite inválida');
    }
  }
  if (!partial || payload.assigneeId !== undefined) out.assigneeId = optionalId(payload.assigneeId, 'Responsable');
  if (!partial || payload.subtasks !== undefined) {
    assert(Array.isArray(payload.subtasks) && payload.subtasks.length <= 60, 400, 'Máximo 60 subtareas');
    out.subtasks = payload.subtasks.map(s => {
      assert(isRecord(s), 400, 'Subtarea inválida');
      assert(typeof s.done === 'boolean', 400, 'La subtarea requiere done booleano');
      return {
        id: text(s.id, 'ID de subtarea', 120, true),
        text: text(s.text, 'Texto de subtarea', 180, true),
        done: s.done,
      };
    });
  }
  return out;
}

// Íconos permitidos en el perfil: no se aceptan HTML ni valores arbitrarios.
const PROFILE_ICONS = ['', '🌸', '🐱', '🌷', '✨', '🌙', '🦊', '🐼', '🦋', '🚀', '🌼', '💜', '🐧'];

// Solo datos visuales personales: el correo, el rol y el ID de Google son inmutables aquí.
function profileInput(payload) {
  assert(isRecord(payload), 400, 'El perfil debe ser un objeto JSON');
  const allowed = ['name', 'color', 'icon'];
  const fields = Object.keys(payload);
  assert(fields.length > 0, 400, 'No se proporcionaron cambios');
  // Rechazar campos no autorizados en lugar de ignorar silenciosamente un cambio de correo.
  assert(fields.every(field => allowed.includes(field)), 400, 'Solo puedes cambiar tu nombre, color o ícono. El correo no se puede modificar.');
  const result = {};
  if (payload.name !== undefined) result.name = text(payload.name, 'Nombre', 70, true);
  if (payload.color !== undefined) result.color = enumValue(payload.color, COLORS, 'Color');
  if (payload.icon !== undefined) result.icon = enumValue(payload.icon, PROFILE_ICONS, 'Ícono');
  return result;
}

module.exports = { projectInput, memberInput, taskInput, profileInput, PROFILE_ICONS, STATUSES, PRIORITIES };
