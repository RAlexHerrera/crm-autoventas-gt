/** Acceso a datos de roles. */
const { pool } = require('../../db/pool');

async function listar() {
  const [filas] = await pool.query(
    `SELECT r.id, r.codigo, r.nombre, r.descripcion,
            (SELECT COUNT(*) FROM usuarios u WHERE u.rol_id = r.id AND u.activo = 1) AS usuariosActivos
       FROM roles r ORDER BY r.id`,
  );
  return filas;
}

async function obtener(id) {
  const [filas] = await pool.query('SELECT id, codigo, nombre, descripcion FROM roles WHERE id = ?', [id]);
  return filas[0] || null;
}

async function actualizar(id, { nombre, descripcion }) {
  await pool.query('UPDATE roles SET nombre = ?, descripcion = ? WHERE id = ?', [
    nombre,
    descripcion || null,
    id,
  ]);
}

module.exports = { listar, obtener, actualizar };
