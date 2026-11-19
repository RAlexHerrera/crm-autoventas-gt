/** Esquemas de validación de cotizaciones. */
const { z } = require('zod');
const { esquemaPaginacion } = require('../../utils/paginacion');
const v = require('../../utils/validaciones');

const ESTADOS = ['Borrador', 'Enviada', 'Aceptada', 'Rechazada', 'Vencida', 'Convertida'];

const listar = z.object({
  ...esquemaPaginacion,
  estado: z.enum(ESTADOS).optional(),
  vendedorId: z.coerce.number().int().positive().optional(),
  desde: v.fecha.optional(),
  hasta: v.fecha.optional(),
});

const linea = z.object({
  vehiculoId: z.coerce.number({ error: 'Seleccione un vehículo.' }).int().positive(),
  descuento: v.monto('Ingrese un descuento válido.').default(0),
});

const guardar = z.object({
  oportunidadId: z.coerce.number({ error: 'Seleccione la oportunidad.' }).int().positive(),
  vigenciaHasta: v.fechaOpcional,
  observaciones: v.textoOpcional(500),
  lineas: z
    .array(linea, { error: 'Agregue al menos un vehículo.' })
    .min(1, 'Agregue al menos un vehículo a la cotización.')
    .max(20, 'Máximo 20 vehículos por cotización.')
    .refine((ls) => new Set(ls.map((l) => l.vehiculoId)).size === ls.length, {
      error: 'Un vehículo no puede repetirse en la misma cotización.',
    }),
});

const estado = z.object({
  estado: z.enum(ESTADOS, { error: 'Seleccione un estado válido.' }),
  comentario: v.textoOpcional(255),
});

module.exports = { listar, guardar, estado, ESTADOS };
