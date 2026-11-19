/** Esquemas de validación de ventas. */
const { z } = require('zod');
const { esquemaPaginacion } = require('../../utils/paginacion');
const v = require('../../utils/validaciones');
const { dpi, nit } = require('../clientes/clientes.schemas');

const METODOS_PAGO = ['Contado', 'Financiamiento', 'Transferencia', 'Cheque'];

const listar = z.object({
  ...esquemaPaginacion,
  vendedorId: z.coerce.number().int().positive().optional(),
  clienteId: z.coerce.number().int().positive().optional(),
  desde: v.fecha.optional(),
  hasta: v.fecha.optional(),
});

const registrar = z.object({
  cotizacionId: z.coerce.number({ error: 'Seleccione la cotización aceptada.' }).int().positive(),
  metodoPago: z.enum(METODOS_PAGO, { error: 'Seleccione el método de pago.' }),
  observaciones: v.textoOpcional(500),
  // Datos opcionales para completar el cliente cuando se convierte un prospecto.
  cliente: z
    .object({ dpi, nit, direccion: v.textoOpcional(255) })
    .optional()
    .default({}),
});

module.exports = { listar, registrar, METODOS_PAGO };
