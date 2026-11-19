/** Esquemas de validación de oportunidades. */
const { z } = require('zod');
const { esquemaPaginacion } = require('../../utils/paginacion');
const v = require('../../utils/validaciones');
const { ETAPAS } = require('./oportunidades.repository');

const ETAPAS_ABIERTAS = ['Prospección', 'Contacto', 'Cotización', 'Negociación'];

const listar = z.object({
  ...esquemaPaginacion,
  etapa: z.enum(ETAPAS).optional(),
  abiertas: v.booleanoQuery,
  vendedorId: z.coerce.number().int().positive().optional(),
  clienteId: z.coerce.number().int().positive().optional(),
  prospectoId: z.coerce.number().int().positive().optional(),
});

const comunes = {
  titulo: v.texto(3, 120, 'Ingrese un título descriptivo (mínimo 3 caracteres).'),
  vehiculoInteresId: v.idOpcional,
  montoEstimado: v.monto('Ingrese el monto estimado.').default(0),
  fechaCierreEstimada: v.fechaOpcional,
};

const crear = z.object({
  ...comunes,
  prospectoId: v.idOpcional,
  clienteId: v.idOpcional,
  vendedorId: v.idOpcional,
  etapa: z.enum(ETAPAS_ABIERTAS, { error: 'Seleccione una etapa inicial válida.' }).default('Prospección'),
});

const actualizar = z.object(comunes);

const etapa = z.object({
  etapa: z.enum(ETAPAS, { error: 'Seleccione una etapa válida.' }),
  motivoPerdida: v.textoOpcional(255),
});

const asignar = z.object({
  vendedorId: z.coerce.number({ error: 'Seleccione un vendedor.' }).int().positive(),
});

const resumen = z.object({ vendedorId: z.coerce.number().int().positive().optional() });

module.exports = { listar, crear, actualizar, etapa, asignar, resumen };
