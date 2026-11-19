/** Acceso a datos de ventas. */
const { pool } = require('../../db/pool');
const { limites, patronLike } = require('../../utils/paginacion');

const COLUMNAS = `vt.id, vt.correlativo, vt.fecha, vt.metodo_pago AS metodoPago, vt.total, vt.observaciones,
  vt.cotizacion_id AS cotizacionId, q.correlativo AS cotizacionCorrelativo, q.oportunidad_id AS oportunidadId,
  vt.cliente_id AS clienteId, CONCAT(c.nombres, ' ', c.apellidos) AS clienteNombre,
  vt.vendedor_id AS vendedorId, u.nombre AS vendedorNombre, vt.registrado_por AS registradoPor,
  (SELECT GROUP_CONCAT(CONCAT(v.marca, ' ', v.modelo, ' ', v.anio) ORDER BY v.id SEPARATOR ', ')
     FROM venta_vehiculos vv JOIN vehiculos v ON v.id = vv.vehiculo_id WHERE vv.venta_id = vt.id) AS vehiculos`;

const JOINS = `FROM ventas vt
  JOIN cotizaciones q ON q.id = vt.cotizacion_id
  JOIN clientes c ON c.id = vt.cliente_id
  JOIN usuarios u ON u.id = vt.vendedor_id`;

async function listar(f) {
  const where = [];
  const params = [];
  if (f.vendedorId) {
    where.push('vt.vendedor_id = ?');
    params.push(f.vendedorId);
  }
  if (f.clienteId) {
    where.push('vt.cliente_id = ?');
    params.push(f.clienteId);
  }
  if (f.desde) {
    where.push('vt.fecha >= ?');
    params.push(f.desde);
  }
  if (f.hasta) {
    where.push('vt.fecha < DATE_ADD(?, INTERVAL 1 DAY)');
    params.push(f.hasta);
  }
  if (f.q) {
    const p = patronLike(f.q);
    where.push(
      "(vt.correlativo LIKE ? OR q.correlativo LIKE ? OR CONCAT(c.nombres, ' ', c.apellidos) LIKE ?)",
    );
    params.push(p, p, p);
  }
  const condicion = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const { limit, offset } = limites(f);
  const [datos] = await pool.query(
    `SELECT ${COLUMNAS} ${JOINS} ${condicion} ORDER BY vt.fecha DESC, vt.id DESC LIMIT ? OFFSET ?`,
    [...params, limit, offset],
  );
  const [[resumen]] = await pool.query(
    `SELECT COUNT(*) AS total, COALESCE(SUM(vt.total), 0) AS montoTotal ${JOINS} ${condicion}`,
    params,
  );
  return { datos, total: resumen.total, montoTotal: Number(resumen.montoTotal) };
}

async function obtener(id, db = pool) {
  const [filas] = await db.query(`SELECT ${COLUMNAS} ${JOINS} WHERE vt.id = ?`, [id]);
  if (!filas[0]) return null;
  const [vehiculos] = await db.query(
    `SELECT v.id, v.vin, v.marca, v.modelo, v.anio, v.color, v.condicion, vv.precio_final AS precioFinal
       FROM venta_vehiculos vv JOIN vehiculos v ON v.id = vv.vehiculo_id WHERE vv.venta_id = ? ORDER BY v.id`,
    [id],
  );
  return { ...filas[0], detalleVehiculos: vehiculos };
}

async function existePorCotizacion(cotizacionId, conn) {
  const [filas] = await conn.query('SELECT id FROM ventas WHERE cotizacion_id = ? FOR UPDATE', [
    cotizacionId,
  ]);
  return filas.length > 0;
}

async function insertarVenta(d, conn) {
  const [r] = await conn.query(
    `INSERT INTO ventas (correlativo, cotizacion_id, cliente_id, vendedor_id, fecha, metodo_pago, total, observaciones, registrado_por)
     VALUES (?, ?, ?, ?, NOW(), ?, ?, ?, ?)`,
    [
      d.correlativo,
      d.cotizacionId,
      d.clienteId,
      d.vendedorId,
      d.metodoPago,
      d.total,
      d.observaciones,
      d.registradoPor,
    ],
  );
  return r.insertId;
}

/** Registra los vehículos de la venta. UNIQUE(vehiculo_id) impide vender dos veces el mismo vehículo. */
async function registrarVehiculosVendidos(ventaId, lineas, conn) {
  const valores = lineas.map((l) => [ventaId, l.vehiculoId, l.subtotal]);
  await conn.query('INSERT INTO venta_vehiculos (venta_id, vehiculo_id, precio_final) VALUES ?', [valores]);
}

module.exports = { listar, obtener, existePorCotizacion, insertarVenta, registrarVehiculosVendidos };
