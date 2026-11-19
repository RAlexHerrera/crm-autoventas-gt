/**
 * Utilidades de paginación y búsqueda para listados.
 */
const { z } = require('zod');

/** Esquema común de query string para listados paginados. */
const esquemaPaginacion = {
  pagina: z.coerce.number().int().min(1).default(1),
  tamano: z.coerce.number().int().min(1).max(100).default(10),
  q: z.string().trim().max(100).optional(),
};

/** Calcula LIMIT/OFFSET. */
function limites({ pagina, tamano }) {
  return { limit: tamano, offset: (pagina - 1) * tamano };
}

/** Formato estándar de respuesta paginada. */
function respuestaPaginada(datos, total, { pagina, tamano }) {
  return { datos, total, pagina, tamano, paginas: Math.max(1, Math.ceil(total / tamano)) };
}

/** Patrón LIKE seguro (escapa comodines del usuario). */
function patronLike(texto) {
  return `%${String(texto).replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
}

module.exports = { esquemaPaginacion, limites, respuestaPaginada, patronLike };
