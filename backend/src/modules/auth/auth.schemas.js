/** Esquemas de validación de autenticación. */
const { z } = require('zod');
const { correo } = require('../../utils/validaciones');

/** Política de contraseñas: mínimo 8 caracteres, al menos una letra y un número. */
const passwordSegura = z
  .string({ error: 'La contraseña es obligatoria.' })
  .min(8, 'La contraseña debe tener al menos 8 caracteres.')
  .max(72, 'La contraseña no puede superar 72 caracteres.')
  .regex(/[A-Za-z]/, 'La contraseña debe incluir al menos una letra.')
  .regex(/[0-9]/, 'La contraseña debe incluir al menos un número.');

const login = z.object({
  email: correo,
  password: z
    .string({ error: 'La contraseña es obligatoria.' })
    .min(1, 'La contraseña es obligatoria.')
    .max(72),
});

const cambiarPassword = z.object({
  actual: z.string().min(1, 'Ingrese su contraseña actual.'),
  nueva: passwordSegura,
});

module.exports = { login, cambiarPassword, passwordSegura };
