/** Acceso a datos de oportunidades (embudo de ventas). */
const { pool } = require('../../db/pool');
const { limites, patronLike } = require('../../utils/paginacion');

const ETAPAS = ['Prospección', 'Contacto', 'Cotización', 'Negociación', 'Ganado', 'Perdido'];

const COLUMNAS = `o.id, o.titulo, o.etapa, o.monto_estimado AS montoEstimado,
  o.fecha_cierre_estimada AS fechaCierreEstimada, o.motivo_perdida AS motivoPerdida, o.cerrada_en AS cerradaEn,
  o.prospecto_id AS prospectoId, o.cliente_id AS clienteId,
  COALESCE(CONCAT(c.nombres, ' ', c.apellidos), CONCAT(p.nombres, ' ', p.apellidos)) AS contactoNombre,
  CASE WHEN o.cliente_id IS NOT NULL THEN 'Cliente' ELSE 'Prospecto' END AS contactoTipo,
  o.vehiculo_interes_id AS vehiculoInteresId,
  CASE WHEN v.id IS NULL THEN NULL ELSE CONCAT(v.marca, ' ', v.modelo, ' ', v.anio) END AS vehiculoInteres,
  o.vendedor_id AS vendedorId, u.nombre AS vendedorNombre, o.creado_en AS creadoEn, o.actualizado_en AS actualizadoEn`;

const JOINS = `FROM oportunidades o
  JOIN usuarios u ON u.id = o.vendedor_id
  LEFT JOIN clientes c ON c.id = o.cliente_id
  LEFT JOIN prospectos p ON p.id = o.prospecto_id
  LEFT JOIN vehiculos v ON v.id = o.vehiculo_interes_id`;

function filtros(f) {
  const where = [];
  const params = [];
  if (f.vendedorId) {
    where.push('o.vendedor_id = ?');
    params.push(f.vendedorId);
  }
  if (f.etapa) {
    where.push('o.etapa = ?');
    params.push(f.etapa);
  }
  if (f.abiertas) where.push("o.etapa NOT IN ('Ganado','Perdido')");
  if (f.clienteId) {
    where.push('o.cliente_id = ?');
    params.push(f.clienteId);
  }
  if (f.prospectoId) {
    where.push('o.prospecto_id = ?');
    params.push(f.prospectoId);
  }
  if (f.q) {
    const p = patronLike(f.q);
    where.push(
      "(o.titulo LIKE ? OR CONCAT(c.nombres, ' ', c.apellidos) LIKE ? OR CONCAT(p.nombres, ' ', p.apellidos) LIKE ?)",
    );
    params.push(p, p, p);
  }
  return { condicion: where.length ? `WHERE ${where.join(' AND ')}` : '', params };
}

async function listar(f) {
  const { condicion, params } = filtros(f);
  const { limit, offset } = limites(f);
  const [datos] = await pool.query(
    `SELECT ${COLUMNAS} ${JOINS} ${condicion}
      ORDER BY FIELD(o.etapa, 'Negociación','Cotización','Contacto','Prospección','Ganado','Perdido'), o.actualizado_en DESC
      LIMIT ? OFFSET ?`,
    [...params, limit, offset],
  );
  const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total ${JOINS} ${condicion}`, params);
  return { datos, total };
}

async function obtener(id, db = pool, bloquear = false) {
  const [filas] = await db.query(
    `SELECT ${COLUMNAS} ${JOINS} WHERE o.id = ?${bloquear ? ' FOR UPDATE' : ''}`,
    [id],
  );
  return filas[0] || null;
}

async function crear(d) {
  const [r] = await pool.query(
    `INSERT INTO oportunidades (titulo, prospecto_id, cliente_id, vehiculo_interes_id, vendedor_id, etapa, monto_estimado, fecha_cierre_estimada)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      d.titulo,
      d.prospectoId || null,
      d.clienteId || null,
      d.vehiculoInteresId || null,
      d.vendedorId,
      d.etapa,
      d.montoEstimado,
      d.fechaCierreEstimada || null,
    ],
  );
  return r.insertId;
}

async function actualizar(id, d) {
  await pool.query(
    `UPDATE oportunidades SET titulo = ?, vehiculo_interes_id = ?, monto_estimado = ?, fecha_cierre_estimada = ?
      WHERE id = ?`,
    [d.titulo, d.vehiculoInteresId || null, d.montoEstimado, d.fechaCierreEstimada || null, id],
  );
}

async function cambiarEtapa(id, etapa, motivoPerdida, db = pool) {
  const cerrada = etapa === 'Ganado' || etapa === 'Perdido';
  await db.query(
    `UPDATE oportunidades SET etapa = ?, motivo_perdida = ?, cerrada_en = ${cerrada ? 'NOW()' : 'NULL'} WHERE id = ?`,
    [etapa, etapa === 'Perdido' ? motivoPerdida : null, id],
  );
}

async function asignar(id, vendedorId, db = pool) {
  await db.query('UPDATE oportunidades SET vendedor_id = ? WHERE id = ?', [vendedorId, id]);
}

/** Cantidad y monto por etapa (vista de embudo / kanban). */
async function resumenPorEtapa(vendedorId) {
  const [filas] = await pool.query(
    `SELECT etapa, COUNT(*) AS cantidad, COALESCE(SUM(monto_estimado), 0) AS monto
       FROM oportunidades ${vendedorId ? 'WHERE vendedor_id = ?' : ''}
      GROUP BY etapa`,
    vendedorId ? [vendedorId] : [],
  );
  return ETAPAS.map((etapa) => {
    const f = filas.find((x) => x.etapa === etapa);
    return { etapa, cantidad: f ? f.cantidad : 0, monto: f ? Number(f.monto) : 0 };
  });
}

module.exports = { ETAPAS, listar, obtener, crear, actualizar, cambiarEtapa, asignar, resumenPorEtapa };
