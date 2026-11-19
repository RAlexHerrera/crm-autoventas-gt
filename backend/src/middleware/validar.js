/**
 * Validación de entrada con Zod. Los datos validados (ya convertidos y con
 * valores por defecto) quedan en `req.valido.body`, `req.valido.query` y
 * `req.valido.params`. En Express 5 `req.query` es de solo lectura, por eso
 * no se sobrescribe.
 */
const { z } = require('zod');

/**
 * @param {{ body?: import('zod').ZodType, query?: import('zod').ZodType, params?: import('zod').ZodType }} esquemas
 */
function validar(esquemas) {
  return (req, _res, next) => {
    req.valido = req.valido || {};
    for (const parte of ['params', 'query', 'body']) {
      if (!esquemas[parte]) continue;
      const resultado = esquemas[parte].safeParse(req[parte] ?? {});
      if (!resultado.success) return next(resultado.error);
      req.valido[parte] = resultado.data;
    }
    return next();
  };
}

/** Parámetro :id numérico positivo. */
const paramsId = z.object({
  id: z.coerce.number().int().positive({ error: 'El identificador no es válido.' }),
});

module.exports = { validar, paramsId };
