/**
 * Validadores Zod reutilizables con mensajes en español.
 */
const { z } = require('zod');

const recortar = (v) => (typeof v === 'string' ? v.trim() : v);
const vacioANull = (v) => {
  const r = recortar(v);
  return r === '' || r === undefined ? null : r;
};

/** Correo obligatorio (se recorta y pasa a minúsculas). */
const correo = z.preprocess(
  (v) => (typeof v === 'string' ? v.trim().toLowerCase() : v),
  z.email({ error: 'Ingrese un correo electrónico válido.' }).max(150),
);

/** Correo opcional: vacío → null. */
const correoOpcional = z.preprocess(
  (v) => {
    const r = vacioANull(v);
    return typeof r === 'string' ? r.toLowerCase() : r;
  },
  z.email({ error: 'Ingrese un correo electrónico válido.' }).max(150).nullable(),
);

/** Texto opcional con longitud máxima: vacío → null. */
const textoOpcional = (max) =>
  z.preprocess(vacioANull, z.string().max(max, `Máximo ${max} caracteres.`).nullable());

/** Texto obligatorio recortado. */
const texto = (min, max, mensaje) =>
  z.preprocess(
    recortar,
    z.string({ error: mensaje }).min(min, mensaje).max(max, `Máximo ${max} caracteres.`),
  );

/** Teléfono guatemalteco o internacional: al menos 8 dígitos. */
const telefono = z.preprocess(
  recortar,
  z
    .string({ error: 'El teléfono es obligatorio.' })
    .regex(/^[0-9+()\-\s]{8,25}$/, 'Ingrese un teléfono válido (al menos 8 dígitos).')
    .refine((t) => t.replace(/\D/g, '').length >= 8, 'El teléfono debe tener al menos 8 dígitos.'),
);

/** Id positivo opcional (vacío → null). */
const idOpcional = z.preprocess(
  (v) => (v === '' || v === undefined ? null : v),
  z.coerce.number().int().positive().nullable(),
);

/** Fecha AAAA-MM-DD. */
const fecha = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use el formato de fecha AAAA-MM-DD.');
const fechaOpcional = z.preprocess(vacioANull, fecha.nullable());

/** Booleano en query string ("true"/"false"). */
const booleanoQuery = z
  .enum(['true', 'false'], { error: 'Use true o false.' })
  .transform((v) => v === 'true')
  .optional();

/** Importe en quetzales con máximo 2 decimales. */
const monto = (mensaje = 'Ingrese un monto válido.') =>
  z.coerce
    .number({ error: mensaje })
    .min(0, 'El monto no puede ser negativo.')
    .max(9999999999.99, 'El monto es demasiado grande.')
    .refine((n) => Math.round(n * 100) === Number((n * 100).toFixed(6)), 'Use como máximo 2 decimales.');

module.exports = {
  correo,
  correoOpcional,
  textoOpcional,
  texto,
  telefono,
  idOpcional,
  fecha,
  fechaOpcional,
  booleanoQuery,
  monto,
};
