/** Acceso a datos de clientes. */
const { pool } = require('../../db/pool');
const { limites, patronLike } = require('../../utils/paginacion');

const COLUMNAS = `c.id, c.nombres, c.apellidos, CONCAT(c.nombres, ' ', c.apellidos) AS nombreCompleto,
  c.dpi, c.nit, c.telefono, c.email, c.direccion, c.clasificacion, c.vendedor_id AS vendedorId,
  u.nombre AS vendedorNombre, c.prospecto_origen_id AS prospectoOrigenId,
  c.creado_en AS creadoEn, c.actualizado_en AS actualizadoEn`;

function construirFiltros(f) {
  const where = [];
  const params = [];
  if (f.vendedorId) {
    where.push('c.vendedor_id = ?');
    params.push(f.vendedorId);
  }
  if (f.clasificacion) {
    where.push('c.clasificacion = ?');
    params.push(f.clasificacion);
  }
  if (f.q) {
    const p = patronLike(f.q);
    where.push(
      "(CONCAT(c.nombres, ' ', c.apellidos) LIKE ? OR c.dpi LIKE ? OR c.nit LIKE ? OR c.email LIKE ? OR c.telefono LIKE ?)",
    );
    params.push(p, p, p, p, p);
  }
  return { condicion: where.length ? `WHERE ${where.join(' AND ')}` : '', params };
}

async function listar(f) {
  const { condicion, params } = construirFiltros(f);
  const { limit, offset } = limites(f);
  const [datos] = await pool.query(
    `SELECT ${COLUMNAS},
            (SELECT COUNT(*) FROM ventas v WHERE v.cliente_id = c.id) AS compras
       FROM clientes c JOIN usuarios u ON u.id = c.vendedor_id
       ${condicion}
      ORDER BY c.apellidos, c.nombres LIMIT ? OFFSET ?`,
    [...params, limit, offset],
  );
  const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total FROM clientes c ${condicion}`, params);
  return { datos, total };
}

async function obtener(id, db = pool) {
  const [filas] = await db.query(
    `SELECT ${COLUMNAS},
            (SELECT COUNT(*) FROM ventas v WHERE v.cliente_id = c.id) AS compras,
            (SELECT COALESCE(SUM(v.total), 0) FROM ventas v WHERE v.cliente_id = c.id) AS totalComprado,
            (SELECT MAX(v.fecha) FROM ventas v WHERE v.cliente_id = c.id) AS ultimaCompra
       FROM clientes c JOIN usuarios u ON u.id = c.vendedor_id
      WHERE c.id = ?`,
    [id],
  );
  return filas[0] || null;
}

async function buscarPorEmail(email, db = pool) {
  if (!email) return null;
  const [filas] = await db.query('SELECT id, vendedor_id AS vendedorId FROM clientes WHERE email = ?', [
    email,
  ]);
  return filas[0] || null;
}

async function crear(d, db = pool) {
  const [r] = await db.query(
    `INSERT INTO clientes (nombres, apellidos, dpi, nit, telefono, email, direccion, clasificacion, vendedor_id, prospecto_origen_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      d.nombres,
      d.apellidos,
      d.dpi || null,
      d.nit || 'CF',
      d.telefono,
      d.email || null,
      d.direccion || null,
      d.clasificacion || 'Nuevo',
      d.vendedorId,
      d.prospectoOrigenId || null,
    ],
  );
  return r.insertId;
}

async function actualizar(id, d) {
  await pool.query(
    `UPDATE clientes SET nombres = ?, apellidos = ?, dpi = ?, nit = ?, telefono = ?, email = ?, direccion = ?,
            clasificacion = ?, vendedor_id = ?
      WHERE id = ?`,
    [
      d.nombres,
      d.apellidos,
      d.dpi || null,
      d.nit || 'CF',
      d.telefono,
      d.email || null,
      d.direccion || null,
      d.clasificacion,
      d.vendedorId,
      id,
    ],
  );
}

async function contarRelaciones(id) {
  const [[fila]] = await pool.query(
    `SELECT (SELECT COUNT(*) FROM oportunidades WHERE cliente_id = ?) AS oportunidades,
            (SELECT COUNT(*) FROM ventas WHERE cliente_id = ?) AS ventas`,
    [id, id],
  );
  return fila;
}

async function eliminar(id) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query('DELETE FROM interacciones WHERE cliente_id = ?', [id]);
    await conn.query('UPDATE prospectos SET cliente_id = NULL WHERE cliente_id = ?', [id]);
    await conn.query('DELETE FROM clientes WHERE id = ?', [id]);
    await conn.commit();
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}

/**
 * Recalcula la clasificación automática tras una compra (HU-15):
 * 1 compra → Regular; 2 o más → Frecuente; total ≥ Q500,000 → VIP.
 * Nunca baja una clasificación VIP asignada manualmente.
 */
async function reclasificarPorCompras(clienteId, db = pool) {
  await db.query(
    `UPDATE clientes c
        JOIN (SELECT cliente_id, COUNT(*) AS n, SUM(total) AS monto FROM ventas WHERE cliente_id = ? GROUP BY cliente_id) v
          ON v.cliente_id = c.id
        SET c.clasificacion = CASE
              WHEN c.clasificacion = 'VIP' OR v.monto >= 500000 THEN 'VIP'
              WHEN v.n >= 2 THEN 'Frecuente'
              ELSE 'Regular' END
      WHERE c.id = ?`,
    [clienteId, clienteId],
  );
}

module.exports = {
  listar,
  obtener,
  buscarPorEmail,
  crear,
  actualizar,
  contarRelaciones,
  eliminar,
  reclasificarPorCompras,
};
