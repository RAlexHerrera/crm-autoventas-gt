/** Lógica de autenticación (HU-01). */
const bcrypt = require('bcryptjs');
const repo = require('./auth.repository');
const { firmarToken } = require('../../middleware/auth');
const { noAutenticado, solicitudInvalida } = require('../../utils/errores');
const config = require('../../config/env');

// Hash ficticio para comparar aunque el usuario no exista (evita revelar
// por tiempo de respuesta qué correos están registrados).
const HASH_FICTICIO = bcrypt.hashSync('contraseña-ficticia-no-usable', 10);

async function iniciarSesion(email, password) {
  const usuario = await repo.buscarPorEmailConHash(email.toLowerCase());
  const coincide = await bcrypt.compare(password, usuario ? usuario.password_hash : HASH_FICTICIO);
  if (!usuario || !coincide) throw noAutenticado('Correo o contraseña incorrectos.');
  if (!usuario.activo) throw noAutenticado('Su usuario está inactivo. Contacte al administrador.');

  await repo.registrarAcceso(usuario.id);
  const token = firmarToken(usuario);
  return {
    token,
    expiraEn: config.jwt.expiraEn,
    usuario: {
      id: usuario.id,
      nombre: usuario.nombre,
      email: usuario.email,
      rol: usuario.rol,
      rolNombre: usuario.rol_nombre,
    },
  };
}

async function cambiarPassword(usuarioId, actual, nueva) {
  const hash = await repo.buscarHashPorId(usuarioId);
  if (!hash || !(await bcrypt.compare(actual, hash))) {
    throw solicitudInvalida('La contraseña actual no es correcta.');
  }
  if (actual === nueva) throw solicitudInvalida('La nueva contraseña debe ser diferente de la actual.');
  await repo.actualizarHash(usuarioId, await bcrypt.hash(nueva, 10));
}

module.exports = { iniciarSesion, cambiarPassword };
