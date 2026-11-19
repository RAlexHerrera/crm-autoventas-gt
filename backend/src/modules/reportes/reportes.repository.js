/**
 * Consultas de reportes gerenciales. Todas reciben un rango de fechas
 * [desde, hasta] (AAAA-MM-DD, inclusivo) y opcionalmente un vendedor.
 */
const { pool } = require('../../db/pool');

const rangoVentas = 'vt.fecha >= ? AND vt.fecha < DATE_ADD(?, INTERVAL 1 DAY)';

function filtroVendedor(columna, vendedorId) {
  return vendedorId ? { sql: ` AND ${columna} = ?`, params: [vendedorId] } : { sql: '', params: [] };
}

/** HU-11: ventas agrupadas por día o mes. */
async function ventasPorPeriodo({ desde, hasta, agrupacion, vendedorId }) {
  const formato = agrupacion === 'dia' ? '%Y-%m-%d' : '%Y-%m';
  const fv = filtroVendedor('vt.vendedor_id', vendedorId);
  const [filas] = await pool.query(
    `SELECT DATE_FORMAT(vt.fecha, ?) AS periodo, COUNT(*) AS cantidad, SUM(vt.total) AS monto
       FROM ventas vt WHERE ${rangoVentas}${fv.sql}
      GROUP BY periodo ORDER BY periodo`,
    [formato, desde, hasta, ...fv.params],
  );
  return filas.map((f) => ({ periodo: f.periodo, cantidad: f.cantidad, monto: Number(f.monto) }));
}

async function totalesVentas({ desde, hasta, vendedorId }) {
  const fv = filtroVendedor('vt.vendedor_id', vendedorId);
  const [[f]] = await pool.query(
    `SELECT COUNT(*) AS cantidad, COALESCE(SUM(vt.total), 0) AS monto,
            (SELECT COUNT(*) FROM venta_vehiculos vv JOIN ventas v2 ON v2.id = vv.venta_id
              WHERE v2.fecha >= ? AND v2.fecha < DATE_ADD(?, INTERVAL 1 DAY)${vendedorId ? ' AND v2.vendedor_id = ?' : ''}) AS unidades
       FROM ventas vt WHERE ${rangoVentas}${fv.sql}`,
    [desde, hasta, ...fv.params, desde, hasta, ...fv.params],
  );
  return { cantidad: f.cantidad, monto: Number(f.monto), unidades: f.unidades };
}

/** HU-12: rendimiento por vendedor (ventas, monto, oportunidades, conversión). */
async function rendimientoVendedores({ desde, hasta }) {
  const [filas] = await pool.query(
    `SELECT u.id AS vendedorId, u.nombre AS vendedor, u.activo = 1 AS activo,
            (SELECT COUNT(*) FROM ventas vt WHERE vt.vendedor_id = u.id AND ${rangoVentas}) AS ventas,
            (SELECT COALESCE(SUM(vt.total), 0) FROM ventas vt WHERE vt.vendedor_id = u.id AND ${rangoVentas}) AS monto,
            (SELECT COUNT(*) FROM cotizaciones q WHERE q.vendedor_id = u.id AND q.fecha BETWEEN ? AND ?) AS cotizaciones,
            (SELECT COUNT(*) FROM oportunidades o WHERE o.vendedor_id = u.id
                AND o.etapa IN ('Ganado','Perdido') AND o.cerrada_en >= ? AND o.cerrada_en < DATE_ADD(?, INTERVAL 1 DAY)) AS oportunidadesCerradas,
            (SELECT COUNT(*) FROM oportunidades o WHERE o.vendedor_id = u.id
                AND o.etapa = 'Ganado' AND o.cerrada_en >= ? AND o.cerrada_en < DATE_ADD(?, INTERVAL 1 DAY)) AS oportunidadesGanadas,
            (SELECT COUNT(*) FROM oportunidades o WHERE o.vendedor_id = u.id AND o.etapa NOT IN ('Ganado','Perdido')) AS oportunidadesAbiertas,
            (SELECT COUNT(*) FROM prospectos p WHERE p.vendedor_id = u.id AND p.creado_en >= ? AND p.creado_en < DATE_ADD(?, INTERVAL 1 DAY)) AS prospectosNuevos
       FROM usuarios u JOIN roles r ON r.id = u.rol_id
      WHERE r.codigo = 'VENDEDOR'
      ORDER BY monto DESC, ventas DESC, u.nombre`,
    [desde, hasta, desde, hasta, desde, hasta, desde, hasta, desde, hasta, desde, hasta],
  );
  return filas.map((f) => ({
    ...f,
    activo: Boolean(f.activo),
    monto: Number(f.monto),
    ticketPromedio: f.ventas ? Number(f.monto) / f.ventas : 0,
    tasaCierre: f.oportunidadesCerradas ? f.oportunidadesGanadas / f.oportunidadesCerradas : 0,
  }));
}

/** HU-13: conversión de prospectos registrados en el período, por fuente. */
async function conversionProspectos({ desde, hasta, vendedorId }) {
  const fv = filtroVendedor('p.vendedor_id', vendedorId);
  const [filas] = await pool.query(
    `SELECT p.fuente, COUNT(*) AS total,
            SUM(p.estado = 'Convertido') AS convertidos,
            SUM(p.estado = 'Descartado') AS descartados,
            SUM(p.estado NOT IN ('Convertido','Descartado')) AS enProceso
       FROM prospectos p
      WHERE p.creado_en >= ? AND p.creado_en < DATE_ADD(?, INTERVAL 1 DAY)${fv.sql}
      GROUP BY p.fuente ORDER BY total DESC`,
    [desde, hasta, ...fv.params],
  );
  const porFuente = filas.map((f) => ({
    fuente: f.fuente,
    total: f.total,
    convertidos: Number(f.convertidos),
    descartados: Number(f.descartados),
    enProceso: Number(f.enProceso),
    tasa: f.total ? Number(f.convertidos) / f.total : 0,
  }));
  const total = porFuente.reduce((a, f) => a + f.total, 0);
  const convertidos = porFuente.reduce((a, f) => a + f.convertidos, 0);
  const [estados] = await pool.query(
    `SELECT p.estado, COUNT(*) AS cantidad FROM prospectos p
      WHERE p.creado_en >= ? AND p.creado_en < DATE_ADD(?, INTERVAL 1 DAY)${fv.sql}
      GROUP BY p.estado`,
    [desde, hasta, ...fv.params],
  );
  return { total, convertidos, tasa: total ? convertidos / total : 0, porFuente, porEstado: estados };
}

/** Vehículos más vendidos (por marca y modelo). */
async function vehiculosMasVendidos({ desde, hasta, limite, vendedorId }) {
  const fv = filtroVendedor('vt.vendedor_id', vendedorId);
  const [filas] = await pool.query(
    `SELECT v.marca, v.modelo, COUNT(*) AS unidades, SUM(vv.precio_final) AS monto
       FROM venta_vehiculos vv
       JOIN ventas vt ON vt.id = vv.venta_id
       JOIN vehiculos v ON v.id = vv.vehiculo_id
      WHERE ${rangoVentas}${fv.sql}
      GROUP BY v.marca, v.modelo
      ORDER BY unidades DESC, monto DESC
      LIMIT ?`,
    [desde, hasta, ...fv.params, limite],
  );
  return filas.map((f) => ({ ...f, vehiculo: `${f.marca} ${f.modelo}`, monto: Number(f.monto) }));
}

/** Funnel de ventas: oportunidades creadas en el período, por etapa actual. */
async function funnel({ desde, hasta, vendedorId }) {
  const fv = filtroVendedor('o.vendedor_id', vendedorId);
  const [filas] = await pool.query(
    `SELECT o.etapa, COUNT(*) AS cantidad, COALESCE(SUM(o.monto_estimado), 0) AS monto
       FROM oportunidades o
      WHERE o.creado_en >= ? AND o.creado_en < DATE_ADD(?, INTERVAL 1 DAY)${fv.sql}
      GROUP BY o.etapa`,
    [desde, hasta, ...fv.params],
  );
  return filas.map((f) => ({ etapa: f.etapa, cantidad: f.cantidad, monto: Number(f.monto) }));
}

/** HU-15: clasificación de clientes con indicadores de compra. */
async function clasificacionClientes({ vendedorId }) {
  const fv = filtroVendedor('c.vendedor_id', vendedorId);
  const [resumen] = await pool.query(
    `SELECT c.clasificacion, COUNT(*) AS clientes, COALESCE(SUM(t.monto), 0) AS monto, COALESCE(SUM(t.compras), 0) AS compras
       FROM clientes c
       LEFT JOIN (SELECT cliente_id, COUNT(*) AS compras, SUM(total) AS monto FROM ventas GROUP BY cliente_id) t
              ON t.cliente_id = c.id
      WHERE 1 = 1${fv.sql}
      GROUP BY c.clasificacion`,
    fv.params,
  );
  // Clasificación sugerida por la regla automática para detectar diferencias.
  const [detalle] = await pool.query(
    `SELECT c.id, CONCAT(c.nombres, ' ', c.apellidos) AS cliente, c.clasificacion, u.nombre AS vendedor,
            COALESCE(t.compras, 0) AS compras, COALESCE(t.monto, 0) AS monto, t.ultimaCompra,
            CASE WHEN COALESCE(t.monto, 0) >= 500000 THEN 'VIP'
                 WHEN COALESCE(t.compras, 0) >= 2 THEN 'Frecuente'
                 WHEN COALESCE(t.compras, 0) = 1 THEN 'Regular'
                 WHEN t.ultimaCompra IS NULL AND c.creado_en < DATE_SUB(NOW(), INTERVAL 1 YEAR) THEN 'Inactivo'
                 ELSE 'Nuevo' END AS sugerida
       FROM clientes c
       JOIN usuarios u ON u.id = c.vendedor_id
       LEFT JOIN (SELECT cliente_id, COUNT(*) AS compras, SUM(total) AS monto, MAX(fecha) AS ultimaCompra
                    FROM ventas GROUP BY cliente_id) t ON t.cliente_id = c.id
      WHERE 1 = 1${fv.sql}
      ORDER BY monto DESC, cliente`,
    fv.params,
  );
  return {
    resumen: resumen.map((r) => ({ ...r, monto: Number(r.monto), compras: Number(r.compras) })),
    clientes: detalle.map((d) => ({ ...d, monto: Number(d.monto) })),
  };
}

/** Indicadores generales (KPI) del dashboard. */
async function indicadores({ desde, hasta, vendedorId }) {
  const fo = filtroVendedor('vendedor_id', vendedorId);
  const [[f]] = await pool.query(
    `SELECT
       (SELECT COUNT(*) FROM oportunidades WHERE etapa NOT IN ('Ganado','Perdido')${fo.sql}) AS oportunidadesAbiertas,
       (SELECT COALESCE(SUM(monto_estimado), 0) FROM oportunidades WHERE etapa NOT IN ('Ganado','Perdido')${fo.sql}) AS montoPipeline,
       (SELECT COUNT(*) FROM cotizaciones WHERE estado IN ('Borrador','Enviada','Aceptada')${fo.sql}) AS cotizacionesAbiertas,
       (SELECT COUNT(*) FROM prospectos WHERE creado_en >= ? AND creado_en < DATE_ADD(?, INTERVAL 1 DAY)${fo.sql}) AS prospectosNuevos,
       (SELECT COUNT(*) FROM clientes WHERE 1 = 1${fo.sql}) AS clientes,
       (SELECT COUNT(*) FROM vehiculos WHERE estado = 'Disponible') AS vehiculosDisponibles,
       (SELECT COALESCE(SUM(precio), 0) FROM vehiculos WHERE estado = 'Disponible') AS valorInventario`,
    [...fo.params, ...fo.params, ...fo.params, desde, hasta, ...fo.params, ...fo.params],
  );
  return {
    ...f,
    montoPipeline: Number(f.montoPipeline),
    valorInventario: Number(f.valorInventario),
  };
}

/** Próximas acciones: oportunidades abiertas con cierre estimado más cercano. */
async function proximosCierres({ vendedorId, limite = 5 }) {
  const fv = filtroVendedor('o.vendedor_id', vendedorId);
  const [filas] = await pool.query(
    `SELECT o.id, o.titulo, o.etapa, o.monto_estimado AS montoEstimado, o.fecha_cierre_estimada AS fechaCierreEstimada,
            u.nombre AS vendedorNombre,
            COALESCE(CONCAT(c.nombres, ' ', c.apellidos), CONCAT(p.nombres, ' ', p.apellidos)) AS contactoNombre
       FROM oportunidades o
       JOIN usuarios u ON u.id = o.vendedor_id
       LEFT JOIN clientes c ON c.id = o.cliente_id
       LEFT JOIN prospectos p ON p.id = o.prospecto_id
      WHERE o.etapa NOT IN ('Ganado','Perdido')${fv.sql}
      ORDER BY o.fecha_cierre_estimada IS NULL, o.fecha_cierre_estimada, o.id
      LIMIT ?`,
    [...fv.params, limite],
  );
  return filas;
}

module.exports = {
  ventasPorPeriodo,
  totalesVentas,
  rendimientoVendedores,
  conversionProspectos,
  vehiculosMasVendidos,
  funnel,
  clasificacionClientes,
  indicadores,
  proximosCierres,
};
