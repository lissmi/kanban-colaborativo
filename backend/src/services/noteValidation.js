// Solo aceptamos texto plano y colores de la paleta; no interpretamos HTML.
const { HttpError } = require('../utils/errors');
const NOTE_COLORS = Object.freeze(['yellow', 'lilac', 'blue', 'pink', 'mint']);

function validateNote(payload, partial = false) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new HttpError(400, 'La nota debe ser un objeto válido');
  }
  const allowed = partial ? ['title', 'content', 'color'] : ['projectId', 'title', 'content', 'color'];
  if (Object.keys(payload).some(key => !allowed.includes(key))) {
    throw new HttpError(400, 'La nota contiene campos no permitidos');
  }
  const result = {};
  for (const [key, max] of [['title', 70], ['content', 1400]]) {
    if (!partial || Object.prototype.hasOwnProperty.call(payload, key)) {
      if (typeof payload[key] !== 'string') throw new HttpError(400, `${key} debe ser texto`);
      const value = payload[key].trim();
      if (!value || value.length > max) throw new HttpError(400, `${key} debe tener entre 1 y ${max} caracteres`);
      result[key] = value;
    }
  }
  if (!partial || Object.prototype.hasOwnProperty.call(payload, 'color')) {
    const color = payload.color ?? 'yellow';
    if (!NOTE_COLORS.includes(color)) throw new HttpError(400, 'Color de nota no válido');
    result.color = color;
  }
  if (partial && !Object.keys(result).length) throw new HttpError(400, 'No se proporcionaron cambios');
  return result;
}
module.exports = { validateNote, NOTE_COLORS };
