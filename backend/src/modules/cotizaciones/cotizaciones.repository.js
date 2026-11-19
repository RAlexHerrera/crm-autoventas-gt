/** Acceso a datos de cotizaciones y su detalle. */
const { pool } = require('../../db/pool');
const { limites, patronLike } = require('../../utils/paginacion');

const COLUMNAS = `q.id, q.correlativo, q.oportunidad_id AS oportunidadId, o.titulo AS oportunidadTitulo,
  o.etapa AS oportunidadEtapa, o.cliente_id AS clienteId, o.prospecto_id AS prospectoId,
  COALESCE(CONCAT(c.nombres, ' ', c.apellidos), CONCAT(p.nombres, ' ', p.apellidos)) AS contactoNombre,
  CASE WHEN o.cliente_id IS NOT NULL THEN 'Cliente' ELSE 'Prospecto' END AS contactoTipo,
  COALESCE(c.email, p.email) AS contactoEmail, COALESCE(c.telefono, p.telefono) AS contactoTelefono,
  c.nit AS contactoNit, c.direccion AS contactoDireccion,
  q.vendedor_id AS vendedorId, u.nombre AS vendedorNombre, u.email AS vendedorEmail,
  q.fecha, q.vigencia_hasta AS vigenciaHasta, q.subtotal, q.descuento, q.base_imponible AS baseImponible,
  q.iva_tasa AS ivaTasa, q.iva, q.total, q.estado, q.observaciones, q.creado_en AS creadoEn,
  (SELECT COUNT(*) FROM detalle_cotizacion d WHERE d.cotizacion_id = q.id) AS cantidadVehiculos,
  (SELECT vt.id FROM ventas vt WHERE vt.cotizacion_id = q.id) AS ventaId`;

const JOINS = `FROM cotizaciones q
  JOIN oportunidades o ON o.id = q.oportunidad_id
  JOIN usuarios u ON u.id = q.vendedor_id
  LEFT JOIN clientes c ON c.id = o.cliente_id
  LEFT JOIN prospectos p ON p.id = o.prospecto_id`;

/** Las cotizaciones en Borrador o Enviada cuya vigencia pasó quedan "Vencida". */
async function marcarVencidas(db = pool) {
  await db.query(
    `UPDATE cotizaciones SET estado = 'Vencida'
      WHERE estado IN ('Borrador', 'Enviada') AND vigencia_hasta < CURDATE()`,
  );
}

async function listar(f) {
  const where = [];
  const params = [];
  if (f.vendedorId) {
    where.push('q.vendedor_id = ?');
    params.push(f.vendedorId);
  }
  if (f.estado) {
    where.push('q.estado = ?');
    params.push(f.estado);
  }
  if (f.desde) {
    where.push('q.fecha >= ?');
    params.push(f.desde);
  }
  if (f.hasta) {
    where.push('q.fecha <= ?');
    params.push(f.hasta);
  }
  if (f.q) {
    const p = patronLike(f.q);
    where.push(
      "(q.correlativo LIKE ? OR CONCAT(c.nombres, ' ', c.apellidos) LIKE ? OR CONCAT(p.nombres, ' ', p.apellidos) LIKE ? OR o.titulo LIKE ?)",
    );
    params.push(p, p, p, p);
  }
  const condicion = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const { limit, offset } = limites(f);
  const [datos] = await pool.query(
    `SELECT ${COLUMNAS} ${JOINS} ${condicion} ORDER BY q.fecha DESC, q.id DESC LIMIT ? OFFSET ?`,
    [...params, limit, offset],
  );
  const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total ${JOINS} ${condicion}`, params);
  return { datos, total };
}

async function obtener(id, db = pool) {
  const [filas] = await db.query(`SELECT ${COLUMNAS} ${JOINS} WHERE q.id = ?`, [id]);
  return filas[0] || null;
}

/** Bloquea la fila de la cotización (SELECT ... FOR UPDATE). */
async function bloquear(id, conn) {
  const [filas] = await conn.query(
    `SELECT id, correlativo, oportunidad_id AS oportunidadId, vendedor_id AS vendedorId, estado, total,
            vigencia_hasta AS vigenciaHasta, vigencia_hasta < CURDATE() AS vencida
       FROM cotizaciones WHERE id = ? FOR UPDATE`,
    [id],
  );
  return filas[0] || null;
}

async function obtenerLineas(cotizacionId, db = pool) {
  const [filas] = await db.query(
    `SELECT d.id, d.vehiculo_id AS vehiculoId, d.precio_unitario AS precioUnitario, d.descuento, d.subtotal,
            v.vin, v.marca, v.modelo, v.anio, v.version, v.color, v.condicion, v.tipo, v.transmision,
            v.combustible, v.kilometraje, v.estado AS vehiculoEstado
       FROM detalle_cotizacion d JOIN vehiculos v ON v.id = d.vehiculo_id
      WHERE d.cotizacion_id = ? ORDER BY d.id`,
    [cotizacionId],
  );
  return filas;
}

async function listarPorOportunidad(oportunidadId) {
  const [filas] = await pool.query(
    `SELECT id, correlativo, fecha, vigencia_hasta AS vigenciaHasta, total, estado
       FROM cotizaciones WHERE oportunidad_id = ? ORDER BY fecha DESC, id DESC`,
    [oportunidadId],
  );
  return filas;
}

async function crear(d, conn) {
  const [r] = await conn.query(
    `INSERT INTO cotizaciones (correlativo, oportunidad_id, vendedor_id, fecha, vigencia_hasta, subtotal, descuento,
                               base_imponible, iva_tasa, iva, total, estado, observaciones)
     VALUES (?, ?, ?, CURDATE(), ?, ?, ?, ?, ?, ?, ?, 'Borrador', ?)`,
    [
      d.correlativo,
      d.oportunidadId,
      d.vendedorId,
      d.vigenciaHasta,
      d.totales.subtotal,
      d.totales.descuento,
      d.totales.baseImponible,
      d.totales.ivaTasa,
      d.totales.iva,
      d.totales.total,
      d.observaciones,
    ],
  );
  return r.insertId;
}

async function actualizarEncabezado(id, d, conn) {
  await conn.query(
    `UPDATE cotizaciones SET vigencia_hasta = ?, subtotal = ?, descuento = ?, base_imponible = ?, iva_tasa = ?,
            iva = ?, total = ?, observaciones = ?
      WHERE id = ?`,
    [
      d.vigenciaHasta,
      d.totales.subtotal,
      d.totales.descuento,
      d.totales.baseImponible,
      d.totales.ivaTasa,
      d.totales.iva,
      d.totales.total,
      d.observaciones,
      id,
    ],
  );
}

async function reemplazarLineas(cotizacionId, lineas, conn) {
  await conn.query('DELETE FROM detalle_cotizacion WHERE cotizacion_id = ?', [cotizacionId]);
  const valores = lineas.map((l) => [cotizacionId, l.vehiculoId, l.precio, l.descuento, l.subtotal]);
  await conn.query(
    'INSERT INTO detalle_cotizacion (cotizacion_id, vehiculo_id, precio_unitario, descuento, subtotal) VALUES ?',
    [valores],
  );
}

async function cambiarEstado(id, estado, db = pool) {
  await db.query('UPDATE cotizaciones SET estado = ? WHERE id = ?', [estado, id]);
}

/**
 * Rechaza las cotizaciones abiertas de una oportunidad perdida y libera los
 * vehículos que estuvieran reservados por ellas.
 */
async function rechazarAbiertasDeOportunidad(oportunidadId, conn) {
  await conn.query(
    `UPDATE vehiculos SET estado = 'Disponible', reservado_cotizacion_id = NULL
      WHERE estado = 'Reservado'
        AND reservado_cotizacion_id IN (SELECT id FROM cotizaciones WHERE oportunidad_id = ? AND estado = 'Aceptada')`,
    [oportunidadId],
  );
  await conn.query(
    `UPDATE cotizaciones SET estado = 'Rechazada'
      WHERE oportunidad_id = ? AND estado IN ('Borrador', 'Enviada', 'Aceptada')`,
    [oportunidadId],
  );
}

async function eliminar(id) {
  await pool.query('DELETE FROM cotizaciones WHERE id = ?', [id]);
}

module.exports = {
  marcarVencidas,
  listar,
  obtener,
  bloquear,
  obtenerLineas,
  listarPorOportunidad,
  crear,
  actualizarEncabezado,
  reemplazarLineas,
  cambiarEstado,
  rechazarAbiertasDeOportunidad,
  eliminar,
};
