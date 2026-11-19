/** Acceso a datos de vehículos e inventario. */
const { pool } = require('../../db/pool');
const { limites, patronLike } = require('../../utils/paginacion');

const COLUMNAS = `v.id, v.vin, v.marca, v.modelo, v.anio, v.version, v.tipo, v.condicion, v.color, v.transmision,
  v.combustible, v.motor, v.kilometraje, v.precio, v.estado, v.reservado_cotizacion_id AS reservadoCotizacionId,
  v.descripcion, v.creado_en AS creadoEn, v.actualizado_en AS actualizadoEn`;

const ORDENES = {
  recientes: 'v.creado_en DESC, v.id DESC',
  precio_asc: 'v.precio ASC',
  precio_desc: 'v.precio DESC',
  anio_desc: 'v.anio DESC, v.marca',
  marca: 'v.marca, v.modelo',
};

async function listar(f) {
  const where = [];
  const params = [];
  const igual = {
    marca: 'v.marca',
    tipo: 'v.tipo',
    condicion: 'v.condicion',
    estado: 'v.estado',
    combustible: 'v.combustible',
    transmision: 'v.transmision',
  };
  for (const [campo, columna] of Object.entries(igual)) {
    if (f[campo]) {
      where.push(`${columna} = ?`);
      params.push(f[campo]);
    }
  }
  if (f.precioMin !== undefined) {
    where.push('v.precio >= ?');
    params.push(f.precioMin);
  }
  if (f.precioMax !== undefined) {
    where.push('v.precio <= ?');
    params.push(f.precioMax);
  }
  if (f.anioMin !== undefined) {
    where.push('v.anio >= ?');
    params.push(f.anioMin);
  }
  if (f.anioMax !== undefined) {
    where.push('v.anio <= ?');
    params.push(f.anioMax);
  }
  if (f.q) {
    const p = patronLike(f.q);
    where.push(
      "(v.vin LIKE ? OR CONCAT(v.marca, ' ', v.modelo) LIKE ? OR v.version LIKE ? OR v.color LIKE ?)",
    );
    params.push(p, p, p, p);
  }
  const condicion = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const { limit, offset } = limites(f);
  const [datos] = await pool.query(
    `SELECT ${COLUMNAS} FROM vehiculos v ${condicion} ORDER BY ${ORDENES[f.orden] || ORDENES.recientes} LIMIT ? OFFSET ?`,
    [...params, limit, offset],
  );
  const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total FROM vehiculos v ${condicion}`, params);
  return { datos, total };
}

async function obtener(id, db = pool) {
  const [filas] = await db.query(`SELECT ${COLUMNAS} FROM vehiculos v WHERE v.id = ?`, [id]);
  return filas[0] || null;
}

/** Bloquea las filas de los vehículos (SELECT ... FOR UPDATE) dentro de una transacción. */
async function bloquearVarios(ids, conn) {
  if (!ids.length) return [];
  const [filas] = await conn.query(
    `SELECT ${COLUMNAS} FROM vehiculos v WHERE v.id IN (?) ORDER BY v.id FOR UPDATE`,
    [ids],
  );
  return filas;
}

async function crear(d) {
  const [r] = await pool.query(
    `INSERT INTO vehiculos (vin, marca, modelo, anio, version, tipo, condicion, color, transmision, combustible, motor, kilometraje, precio, descripcion)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      d.vin,
      d.marca,
      d.modelo,
      d.anio,
      d.version,
      d.tipo,
      d.condicion,
      d.color,
      d.transmision,
      d.combustible,
      d.motor,
      d.kilometraje,
      d.precio,
      d.descripcion,
    ],
  );
  return r.insertId;
}

async function actualizar(id, d) {
  await pool.query(
    `UPDATE vehiculos SET vin = ?, marca = ?, modelo = ?, anio = ?, version = ?, tipo = ?, condicion = ?, color = ?,
            transmision = ?, combustible = ?, motor = ?, kilometraje = ?, precio = ?, descripcion = ?
      WHERE id = ?`,
    [
      d.vin,
      d.marca,
      d.modelo,
      d.anio,
      d.version,
      d.tipo,
      d.condicion,
      d.color,
      d.transmision,
      d.combustible,
      d.motor,
      d.kilometraje,
      d.precio,
      d.descripcion,
      id,
    ],
  );
}

async function cambiarEstado(ids, estado, reservadoCotizacionId, db = pool) {
  const lista = Array.isArray(ids) ? ids : [ids];
  if (!lista.length) return;
  await db.query('UPDATE vehiculos SET estado = ?, reservado_cotizacion_id = ? WHERE id IN (?)', [
    estado,
    reservadoCotizacionId || null,
    lista,
  ]);
}

async function contarCotizaciones(id) {
  const [[{ total }]] = await pool.query(
    'SELECT COUNT(*) AS total FROM detalle_cotizacion WHERE vehiculo_id = ?',
    [id],
  );
  return total;
}

async function eliminar(id) {
  await pool.query('DELETE FROM vehiculos WHERE id = ?', [id]);
}

async function marcas() {
  const [filas] = await pool.query('SELECT DISTINCT marca FROM vehiculos ORDER BY marca');
  return filas.map((f) => f.marca);
}

/** Control de inventario básico (HU-08). */
async function resumenInventario() {
  const [porEstado] = await pool.query(
    'SELECT estado, COUNT(*) AS cantidad, COALESCE(SUM(precio), 0) AS valor FROM vehiculos GROUP BY estado',
  );
  const [porCondicion] = await pool.query(
    `SELECT condicion, COUNT(*) AS cantidad FROM vehiculos WHERE estado <> 'Vendido' GROUP BY condicion`,
  );
  const [porMarca] = await pool.query(
    `SELECT marca, COUNT(*) AS cantidad FROM vehiculos WHERE estado <> 'Vendido' GROUP BY marca ORDER BY cantidad DESC, marca`,
  );
  const [porTipo] = await pool.query(
    `SELECT tipo, COUNT(*) AS cantidad FROM vehiculos WHERE estado = 'Disponible' GROUP BY tipo ORDER BY cantidad DESC`,
  );
  const estados = ['Disponible', 'Reservado', 'Vendido'].map((estado) => {
    const f = porEstado.find((x) => x.estado === estado);
    return { estado, cantidad: f ? f.cantidad : 0, valor: f ? Number(f.valor) : 0 };
  });
  return { porEstado: estados, porCondicion, porMarca, porTipo };
}

module.exports = {
  listar,
  obtener,
  bloquearVarios,
  crear,
  actualizar,
  cambiarEstado,
  contarCotizaciones,
  eliminar,
  marcas,
  resumenInventario,
};
