/** Acceso a datos de interacciones (historial de contacto). */
const { pool } = require('../../db/pool');

async function listar({ clienteId, prospectoId, oportunidadId }) {
  const where = [];
  const params = [];
  if (clienteId) {
    where.push('i.cliente_id = ?');
    params.push(clienteId);
  }
  if (prospectoId) {
    where.push('i.prospecto_id = ?');
    params.push(prospectoId);
  }
  if (oportunidadId) {
    where.push('i.oportunidad_id = ?');
    params.push(oportunidadId);
  }
  // Se exige al menos un filtro (lo valida el esquema); OR permite ver el historial
  // completo de un cliente que antes fue prospecto.
  const [filas] = await pool.query(
    `SELECT i.id, i.tipo, i.descripcion, i.fecha, i.cliente_id AS clienteId, i.prospecto_id AS prospectoId,
            i.oportunidad_id AS oportunidadId, o.titulo AS oportunidadTitulo,
            i.usuario_id AS usuarioId, u.nombre AS usuarioNombre
       FROM interacciones i
       JOIN usuarios u ON u.id = i.usuario_id
       LEFT JOIN oportunidades o ON o.id = i.oportunidad_id
      WHERE ${where.join(' OR ')}
      ORDER BY i.fecha DESC, i.id DESC
      LIMIT 200`,
    params,
  );
  return filas;
}

/**
 * Registra una interacción. Recibe `db` para poder usarse dentro de
 * transacciones (p. ej. al registrar una venta).
 */
async function crear(d, db = pool) {
  const [r] = await db.query(
    `INSERT INTO interacciones (cliente_id, prospecto_id, oportunidad_id, usuario_id, tipo, descripcion, fecha)
     VALUES (?, ?, ?, ?, ?, ?, COALESCE(?, NOW()))`,
    [
      d.clienteId || null,
      d.prospectoId || null,
      d.oportunidadId || null,
      d.usuarioId,
      d.tipo,
      d.descripcion,
      d.fecha || null,
    ],
  );
  return r.insertId;
}

async function obtener(id) {
  const [filas] = await pool.query(
    `SELECT i.id, i.tipo, i.descripcion, i.fecha, i.cliente_id AS clienteId, i.prospecto_id AS prospectoId,
            i.oportunidad_id AS oportunidadId, i.usuario_id AS usuarioId, u.nombre AS usuarioNombre
       FROM interacciones i JOIN usuarios u ON u.id = i.usuario_id WHERE i.id = ?`,
    [id],
  );
  return filas[0] || null;
}

module.exports = { listar, crear, obtener };
