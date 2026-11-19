/** Esquemas de validación de interacciones. */
const { z } = require('zod');
const v = require('../../utils/validaciones');

// "Sistema" se reserva para registros automáticos (cambios de etapa, ventas).
const TIPOS_MANUALES = ['Llamada', 'Correo', 'WhatsApp', 'Visita', 'Reunión', 'Prueba de manejo', 'Nota'];

const listar = z
  .object({
    clienteId: v.idOpcional,
    prospectoId: v.idOpcional,
    oportunidadId: v.idOpcional,
  })
  .refine((f) => f.clienteId || f.prospectoId || f.oportunidadId, {
    error: 'Indique clienteId, prospectoId u oportunidadId.',
  });

const crear = z.object({
  clienteId: v.idOpcional,
  prospectoId: v.idOpcional,
  oportunidadId: v.idOpcional,
  tipo: z.enum(TIPOS_MANUALES, { error: 'Seleccione un tipo de interacción válido.' }),
  descripcion: v.texto(3, 1000, 'Describa la interacción (mínimo 3 caracteres).'),
  fecha: z.preprocess(
    (x) => (x === '' || x === undefined ? null : x),
    z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}([ T]\d{2}:\d{2}(:\d{2})?)?$/, 'Fecha inválida.')
      .transform((x) => x.replace('T', ' '))
      .nullable(),
  ),
});

module.exports = { listar, crear, TIPOS_MANUALES };
