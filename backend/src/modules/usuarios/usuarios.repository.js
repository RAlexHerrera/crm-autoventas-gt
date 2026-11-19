/** Acceso a datos de usuarios. Nunca selecciona password_hash para respuestas. */
const { pool } = require('../../db/pool');
const { limites, patronLike } = require('../../utils/paginacion');

const COLUMNAS = `u.id, u.nombre, u.email, u.activo = 1 AS activo, u.ultimo_acceso AS ultimoAcceso,
  u.creado_en AS creadoEn, r.id AS rolId, r.codigo AS rol, r.nombre AS rolNombre`;

async function listar(filtros) {
  const where = [];
  const params = [];
  if (filtros.q) {
    where.push('(u.nombre LIKE ? OR u.email LIKE ?)');
    params.push(patronLike(filtros.q), patronLike(filtros.q));
  }
  if (filtros.rol) {
    where.push('r.codigo = ?');
    params.push(filtros.rol);
  }
  if (filtros.activo !== undefined) {
    where.push('u.activo = ?');
    params.push(filtros.activo ? 1 : 0);
  }
  const condicion = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const { limit, offset } = limites(filtros);
  const [datos] = await pool.query(
    `SELECT ${COLUMNAS} FROM usuarios u JOIN roles r ON r.id = u.rol_id ${condicion}
      ORDER BY u.nombre LIMIT ? OFFSET ?`,
    [...params, limit, offset],
  );
  const [[{ total }]] = await pool.query(
    `SELECT COUNT(*) AS total FROM usuarios u JOIN roles r ON r.id = u.rol_id ${condicion}`,
    params,
  );
  return { datos: datos.map(normalizar), total };
}

async function obtener(id) {
  const [filas] = await pool.query(
    `SELECT ${COLUMNAS} FROM usuarios u JOIN roles r ON r.id = u.rol_id WHERE u.id = ?`,
    [id],
  );
  return filas[0] ? normalizar(filas[0]) : null;
}

async function listarVendedoresActivos() {
  const [filas] = await pool.query(
    `SELECT u.id, u.nombre FROM usuarios u JOIN roles r ON r.id = u.rol_id
      WHERE r.codigo = 'VENDEDOR' AND u.activo = 1 ORDER BY u.nombre`,
  );
  return filas;
}

async function esVendedorActivo(id) {
  const [filas] = await pool.query(
    `SELECT 1 FROM usuarios u JOIN roles r ON r.id = u.rol_id
      WHERE u.id = ? AND u.activo = 1 AND r.codigo = 'VENDEDOR'`,
    [id],
  );
  return filas.length > 0;
}

async function crear({ nombre, email, passwordHash, rolId }) {
  const [r] = await pool.query(
    'INSERT INTO usuarios (nombre, email, password_hash, rol_id) VALUES (?, ?, ?, ?)',
    [nombre, email, passwordHash, rolId],
  );
  return r.insertId;
}

async function actualizar(id, { nombre, email, rolId, activo }) {
  await pool.query('UPDATE usuarios SET nombre = ?, email = ?, rol_id = ?, activo = ? WHERE id = ?', [
    nombre,
    email,
    rolId,
    activo ? 1 : 0,
    id,
  ]);
}

async function cambiarHash(id, hash) {
  await pool.query('UPDATE usuarios SET password_hash = ? WHERE id = ?', [hash, id]);
}

async function cambiarActivo(id, activo) {
  await pool.query('UPDATE usuarios SET activo = ? WHERE id = ?', [activo ? 1 : 0, id]);
}

async function contarAdminsActivos() {
  const [[{ total }]] = await pool.query(
    `SELECT COUNT(*) AS total FROM usuarios u JOIN roles r ON r.id = u.rol_id
      WHERE r.codigo = 'ADMIN' AND u.activo = 1`,
  );
  return total;
}

/** Cantidad de registros comerciales asignados (para advertir antes de desactivar). */
async function contarAsignaciones(id) {
  const [[fila]] = await pool.query(
    `SELECT (SELECT COUNT(*) FROM clientes WHERE vendedor_id = ?) AS clientes,
            (SELECT COUNT(*) FROM prospectos WHERE vendedor_id = ? AND estado NOT IN ('Convertido','Descartado')) AS prospectos,
            (SELECT COUNT(*) FROM oportunidades WHERE vendedor_id = ? AND etapa NOT IN ('Ganado','Perdido')) AS oportunidades`,
    [id, id, id],
  );
  return fila;
}

function normalizar(u) {
  return { ...u, activo: Boolean(u.activo) };
}

module.exports = {
  listar,
  obtener,
  listarVendedoresActivos,
  esVendedorActivo,
  crear,
  actualizar,
  cambiarHash,
  cambiarActivo,
  contarAdminsActivos,
  contarAsignaciones,
};
