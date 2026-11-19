/**
 * Manejo centralizado de errores: convierte errores de validación, de MySQL
 * y de la aplicación en respuestas JSON con mensajes en español. Nunca expone
 * trazas ni SQL al cliente.
 */
const { ZodError } = require('zod');
const { AppError } = require('../utils/errores');

// Mensajes amigables para las restricciones UNIQUE del esquema.
const MENSAJES_UNICOS = {
  uq_usuarios_email: 'Ya existe un usuario con ese correo electrónico.',
  uq_roles_nombre: 'Ya existe un rol con ese nombre.',
  uq_vehiculos_vin: 'Ya existe un vehículo registrado con ese VIN.',
  uq_clientes_dpi: 'Ya existe un cliente con ese DPI.',
  uq_clientes_email: 'Ya existe un cliente con ese correo electrónico.',
  uq_clientes_prospecto: 'Ese prospecto ya fue convertido en cliente.',
  uq_prospectos_email: 'Ya existe un prospecto con ese correo electrónico.',
  uq_prospectos_telefono: 'Ya existe un prospecto con ese número de teléfono.',
  uq_cotizaciones_correlativo: 'El correlativo de la cotización ya existe. Intente de nuevo.',
  uq_detalle_cotizacion_vehiculo: 'Un vehículo no puede repetirse en la misma cotización.',
  uq_ventas_cotizacion: 'Esta cotización ya fue convertida en venta.',
  uq_ventas_correlativo: 'El correlativo de la venta ya existe. Intente de nuevo.',
  uq_venta_vehiculos_vehiculo: 'El vehículo ya fue vendido.',
};

function mensajeDuplicado(error) {
  const clave = Object.keys(MENSAJES_UNICOS).find((k) => String(error.sqlMessage || '').includes(k));
  return clave ? MENSAJES_UNICOS[clave] : 'El registro ya existe.';
}

function manejadorErrores(error, req, res, _next) {
  if (error instanceof ZodError) {
    return res.status(400).json({
      mensaje: 'Revise los datos ingresados.',
      errores: error.issues.map((i) => ({ campo: i.path.join('.'), mensaje: i.message })),
    });
  }
  if (error instanceof AppError) {
    return res.status(error.status).json({ mensaje: error.message, ...(error.detalles || {}) });
  }
  if (error && error.type === 'entity.parse.failed') {
    return res.status(400).json({ mensaje: 'El cuerpo de la solicitud no es un JSON válido.' });
  }
  switch (error && error.code) {
    case 'ER_DUP_ENTRY':
      return res.status(409).json({ mensaje: mensajeDuplicado(error) });
    case 'ER_CHECK_CONSTRAINT_VIOLATED':
      return res.status(400).json({ mensaje: 'Los datos no cumplen las reglas de negocio del sistema.' });
    case 'ER_NO_REFERENCED_ROW_2':
      return res.status(400).json({ mensaje: 'Uno de los registros relacionados no existe.' });
    case 'ER_ROW_IS_REFERENCED_2':
      return res.status(409).json({ mensaje: 'No se puede eliminar porque tiene registros relacionados.' });
    case 'ER_LOCK_DEADLOCK':
    case 'ER_LOCK_WAIT_TIMEOUT':
      return res
        .status(409)
        .json({ mensaje: 'Otro usuario está modificando estos datos. Intente de nuevo.' });
    default:
      break;
  }
  if (process.env.NODE_ENV !== 'test') {
    console.error(
      `[${new Date().toISOString()}] Error no controlado en ${req.method} ${req.originalUrl}`,
      error,
    );
  }
  return res.status(500).json({ mensaje: 'Ocurrió un error interno. Intente de nuevo más tarde.' });
}

function rutaNoEncontrada(req, res) {
  res.status(404).json({ mensaje: `La ruta ${req.method} ${req.originalUrl} no existe.` });
}

module.exports = { manejadorErrores, rutaNoEncontrada };
