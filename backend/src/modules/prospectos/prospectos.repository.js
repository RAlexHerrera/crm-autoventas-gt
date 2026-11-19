/** Acceso a datos de prospectos (leads). */
const { pool } = require('../../db/pool');
const { limites, patronLike } = require('../../utils/paginacion');

const COLUMNAS = `p.id, p.nombres, p.apellidos, CONCAT(p.nombres, ' ', p.apellidos) AS nombreCompleto,
  p.telefono, p.email, p.fuente, p.interes, p.estado, p.vendedor_id AS vendedorId, u.nombre AS vendedorNombre,
  p.cliente_id AS clienteId, p.creado_por AS creadoPor, p.creado_en AS creadoEn, p.actualizado_en AS actualizadoEn`;

async function listar(f) {
  const where = [];
  const params = [];
  if (f.vendedorId) {
    where.push('p.vendedor_id = ?');
    params.push(f.vendedorId);
  }
  if (f.estado) {
    where.push('p.estado = ?');
    params.push(f.estado);
  }
  if (f.fuente) {
    where.push('p.fuente = ?');
    params.push(f.fuente);
  }
  if (f.q) {
    const p = patronLike(f.q);
    where.push(
      "(CONCAT(p.nombres, ' ', p.apellidos) LIKE ? OR p.email LIKE ? OR p.telefono LIKE ? OR p.interes LIKE ?)",
    );
    params.push(p, p, p, p);
  }
  const condicion = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const { limit, offset } = limites(f);
  const [datos] = await pool.query(
    `SELECT ${COLUMNAS},
            (SELECT COUNT(*) FROM oportunidades o WHERE o.prospecto_id = p.id AND o.etapa NOT IN ('Ganado','Perdido')) AS oportunidadesAbiertas
       FROM prospectos p JOIN usuarios u ON u.id = p.vendedor_id
       ${condicion}
      ORDER BY p.creado_en DESC, p.id DESC LIMIT ? OFFSET ?`,
    [...params, limit, offset],
  );
  const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total FROM prospectos p ${condicion}`, params);
  return { datos, total };
}

async function obtener(id, db = pool, bloquear = false) {
  const [filas] = await db.query(
    `SELECT ${COLUMNAS} FROM prospectos p JOIN usuarios u ON u.id = p.vendedor_id WHERE p.id = ?${
      bloquear ? ' FOR UPDATE' : ''
    }`,
    [id],
  );
  return filas[0] || null;
}

/**
 * Busca registros que coincidan por correo o teléfono (solo dígitos) en
 * prospectos y clientes. Base de la detección de duplicados (HU-04).
 */
async function buscarDuplicados({ email, telefonoNormalizado, excluirProspectoId }) {
  const [prospectos] = await pool.query(
    `SELECT 'prospecto' AS tipo, p.id, CONCAT(p.nombres, ' ', p.apellidos) AS nombre, p.email, p.telefono,
            p.estado, p.vendedor_id AS vendedorId, u.nombre AS vendedorNombre,
            CASE WHEN p.email = ? THEN 'correo' ELSE 'teléfono' END AS coincidencia
       FROM prospectos p JOIN usuarios u ON u.id = p.vendedor_id
      WHERE (p.email = ? OR p.telefono_normalizado = ?) AND p.id <> ?`,
    [email, email, telefonoNormalizado, excluirProspectoId || 0],
  );
  const [clientes] = await pool.query(
    `SELECT 'cliente' AS tipo, c.id, CONCAT(c.nombres, ' ', c.apellidos) AS nombre, c.email, c.telefono,
            c.clasificacion AS estado, c.vendedor_id AS vendedorId, u.nombre AS vendedorNombre,
            CASE WHEN c.email = ? THEN 'correo' ELSE 'teléfono' END AS coincidencia
       FROM clientes c JOIN usuarios u ON u.id = c.vendedor_id
      WHERE (c.email = ? OR REGEXP_REPLACE(c.telefono, '[^0-9]', '') = ?)
        AND (c.prospecto_origen_id IS NULL OR c.prospecto_origen_id <> ?)`,
    [email, email, telefonoNormalizado, excluirProspectoId || 0],
  );
  return [...prospectos, ...clientes];
}

async function crear(d) {
  const [r] = await pool.query(
    `INSERT INTO prospectos (nombres, apellidos, telefono, telefono_normalizado, email, fuente, interes, estado, vendedor_id, creado_por)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      d.nombres,
      d.apellidos,
      d.telefono,
      d.telefonoNormalizado,
      d.email,
      d.fuente,
      d.interes,
      d.estado,
      d.vendedorId,
      d.creadoPor,
    ],
  );
  return r.insertId;
}

async function actualizar(id, d) {
  await pool.query(
    `UPDATE prospectos SET nombres = ?, apellidos = ?, telefono = ?, telefono_normalizado = ?, email = ?,
            fuente = ?, interes = ?, estado = ?
      WHERE id = ?`,
    [d.nombres, d.apellidos, d.telefono, d.telefonoNormalizado, d.email, d.fuente, d.interes, d.estado, id],
  );
}

async function asignar(id, vendedorId, db = pool) {
  await db.query('UPDATE prospectos SET vendedor_id = ? WHERE id = ?', [vendedorId, id]);
  // Las oportunidades abiertas del prospecto acompañan la reasignación.
  await db.query(
    `UPDATE oportunidades SET vendedor_id = ? WHERE prospecto_id = ? AND etapa NOT IN ('Ganado','Perdido')`,
    [vendedorId, id],
  );
}

async function marcarConvertido(id, clienteId, db = pool) {
  await db.query(`UPDATE prospectos SET estado = 'Convertido', cliente_id = ? WHERE id = ?`, [clienteId, id]);
  // Las oportunidades del prospecto quedan vinculadas también al nuevo cliente.
  await db.query('UPDATE oportunidades SET cliente_id = ? WHERE prospecto_id = ? AND cliente_id IS NULL', [
    clienteId,
    id,
  ]);
}

async function contarOportunidades(id) {
  const [[{ total }]] = await pool.query(
    'SELECT COUNT(*) AS total FROM oportunidades WHERE prospecto_id = ?',
    [id],
  );
  return total;
}

async function eliminar(id) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query('DELETE FROM interacciones WHERE prospecto_id = ?', [id]);
    await conn.query('DELETE FROM prospectos WHERE id = ?', [id]);
    await conn.commit();
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}

module.exports = {
  listar,
  obtener,
  buscarDuplicados,
  crear,
  actualizar,
  asignar,
  marcarConvertido,
  contarOportunidades,
  eliminar,
};
