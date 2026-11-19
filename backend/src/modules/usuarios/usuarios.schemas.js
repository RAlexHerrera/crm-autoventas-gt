/** Esquemas de validación de usuarios. */
const { z } = require('zod');
const { correo } = require('../../utils/validaciones');
const { esquemaPaginacion } = require('../../utils/paginacion');
const { passwordSegura } = require('../auth/auth.schemas');

const booleanoQueryLocal = z
  .enum(['true', 'false'], { error: 'Use true o false.' })
  .transform((v) => v === 'true')
  .optional();

const listar = z.object({
  ...esquemaPaginacion,
  rol: z.enum(['ADMIN', 'GERENTE', 'VENDEDOR']).optional(),
  activo: booleanoQueryLocal,
});

const base = {
  nombre: z.string().trim().min(3, 'El nombre debe tener al menos 3 caracteres.').max(120),
  email: correo,
  rolId: z.coerce.number().int().positive('Seleccione un rol.'),
};

const crear = z.object({ ...base, password: passwordSegura });
const actualizar = z.object({ ...base, activo: z.boolean() });
const restablecer = z.object({ password: passwordSegura });
const activo = z.object({ activo: z.boolean({ error: 'Indique si el usuario queda activo (true/false).' }) });

module.exports = { listar, crear, actualizar, restablecer, activo };
