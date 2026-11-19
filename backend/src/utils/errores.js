/**
 * Errores de aplicación con código HTTP y mensaje en español apto para el usuario.
 */
class AppError extends Error {
  /**
   * @param {number} status Código HTTP
   * @param {string} mensaje Mensaje entendible para el usuario
   * @param {object} [detalles] Información adicional (p. ej. registros duplicados)
   */
  constructor(status, mensaje, detalles) {
    super(mensaje);
    this.name = 'AppError';
    this.status = status;
    this.detalles = detalles;
  }
}

const solicitudInvalida = (mensaje, detalles) => new AppError(400, mensaje, detalles);
const noAutenticado = (mensaje = 'Debe iniciar sesión para continuar.') => new AppError(401, mensaje);
const prohibido = (mensaje = 'No tiene permisos para realizar esta acción.') => new AppError(403, mensaje);
const noEncontrado = (mensaje = 'El recurso solicitado no existe.') => new AppError(404, mensaje);
const conflicto = (mensaje, detalles) => new AppError(409, mensaje, detalles);

module.exports = { AppError, solicitudInvalida, noAutenticado, prohibido, noEncontrado, conflicto };
