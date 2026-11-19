/** Esquemas de validación de clientes. */
const { z } = require('zod');
const { esquemaPaginacion } = require('../../utils/paginacion');
const v = require('../../utils/validaciones');

const CLASIFICACIONES = ['Nuevo', 'Regular', 'Frecuente', 'VIP', 'Inactivo'];

const listar = z.object({
  ...esquemaPaginacion,
  clasificacion: z.enum(CLASIFICACIONES).optional(),
  vendedorId: z.coerce.number().int().positive().optional(),
});

const dpi = z.preprocess(
  (x) => (typeof x === 'string' ? x.replace(/\s/g, '') : x) || null,
  z
    .string()
    .regex(/^\d{13}$/, 'El DPI debe tener exactamente 13 dígitos.')
    .nullable(),
);

const nit = z.preprocess(
  (x) => (typeof x === 'string' ? x.trim().toUpperCase() : x) || 'CF',
  z.string().regex(/^(CF|\d{1,12}-?[0-9K])$/, 'Ingrese un NIT válido (por ejemplo 1234567-8) o CF.'),
);

const guardar = z.object({
  nombres: v.texto(2, 80, 'Ingrese los nombres (mínimo 2 caracteres).'),
  apellidos: v.texto(2, 80, 'Ingrese los apellidos (mínimo 2 caracteres).'),
  dpi,
  nit,
  telefono: v.telefono,
  email: v.correoOpcional,
  direccion: v.textoOpcional(255),
  clasificacion: z.enum(CLASIFICACIONES, { error: 'Seleccione una clasificación válida.' }).default('Nuevo'),
  vendedorId: v.idOpcional,
});

module.exports = { listar, guardar, CLASIFICACIONES, dpi, nit };
