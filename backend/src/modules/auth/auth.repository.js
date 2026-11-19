/** Acceso a datos para autenticación. */
const { pool } = require('../../db/pool');

/** Incluye password_hash: SOLO para uso interno del servicio de login. */
async function buscarPorEmailConHash(email) {
  const [filas] = await pool.query(
    `SELECT u.id, u.nombre, u.email, u.password_hash, u.activo, r.codigo AS rol, r.nombre AS rol_nombre
       FROM usuarios u JOIN roles r ON r.id = u.rol_id
      WHERE u.email = ?`,
    [email],
  );
  return filas[0] || null;
}

async function buscarHashPorId(id) {
  const [filas] = await pool.query('SELECT password_hash FROM usuarios WHERE id = ?', [id]);
  return filas[0] ? filas[0].password_hash : null;
}

async function registrarAcceso(id) {
  await pool.query('UPDATE usuarios SET ultimo_acceso = NOW() WHERE id = ?', [id]);
}

async function actualizarHash(id, hash) {
  await pool.query('UPDATE usuarios SET password_hash = ? WHERE id = ?', [hash, id]);
}

module.exports = { buscarPorEmailConHash, buscarHashPorId, registrarAcceso, actualizarHash };
