// Muestra errores útiles sin devolver detalles internos de MongoDB o del servidor.
function errorHandler(error, _req, res, _next) {
  if (error.status) return res.status(error.status).json({ error: error.message });
  if (error.name === 'ValidationError') return res.status(400).json({ error: error.message });
  if (error.name === 'CastError') return res.status(400).json({ error: 'Identificador inválido' });
  if (error.code === 11000) return res.status(409).json({ error: 'Ya existe un registro con ese identificador' });
  if (error.type === 'entity.too.large') return res.status(413).json({ error: 'Solicitud demasiado grande' });
  if (error instanceof SyntaxError && error.status === 400) return res.status(400).json({ error: 'JSON incorrecto' });
  console.error('[API]', error);
  return res.status(500).json({ error: 'Error interno del servidor' });
}
module.exports = errorHandler;
