/** Administración de usuarios (HU-01). Solo el Administrador. */
const bcrypt = require('bcryptjs');
const repo = require('./usuarios.repository');
const rolesRepo = require('../roles/roles.repository');
const { respuestaPaginada } = require('../../utils/paginacion');
const { noEncontrado, solicitudInvalida, conflicto } = require('../../utils/errores');

async function listar(filtros) {
  const { datos, total } = await repo.listar(filtros);
  return respuestaPaginada(datos, total, filtros);
}

async function obtener(id) {
  const usuario = await repo.obtener(id);
  if (!usuario) throw noEncontrado('El usuario no existe.');
  return usuario;
}

async function validarRol(rolId) {
  const rol = await rolesRepo.obtener(rolId);
  if (!rol) throw solicitudInvalida('El rol seleccionado no existe.');
  return rol;
}

async function crear(datos) {
  await validarRol(datos.rolId);
  const passwordHash = await bcrypt.hash(datos.password, 10);
  const id = await repo.crear({ ...datos, email: datos.email.toLowerCase(), passwordHash });
  return repo.obtener(id);
}

/**
 * Evita dejar el sistema sin administradores activos y que un administrador
 * se quite a sí mismo el acceso por error.
 */
async function protegerUltimoAdmin(actual, nuevoRolCodigo, nuevoActivo, solicitanteId) {
  const dejaDeSerAdminActivo =
    actual.rol === 'ADMIN' && actual.activo && (nuevoRolCodigo !== 'ADMIN' || !nuevoActivo);
  if (dejaDeSerAdminActivo && actual.id === solicitanteId) {
    throw conflicto('No puede quitarse a sí mismo el rol de administrador ni desactivar su propio usuario.');
  }
  if (dejaDeSerAdminActivo && (await repo.contarAdminsActivos()) <= 1) {
    throw conflicto('Debe existir al menos un administrador activo.');
  }
}

async function actualizar(id, datos, solicitanteId) {
  const actual = await obtener(id);
  const rol = await validarRol(datos.rolId);
  await protegerUltimoAdmin(actual, rol.codigo, datos.activo, solicitanteId);
  await repo.actualizar(id, { ...datos, email: datos.email.toLowerCase() });
  return repo.obtener(id);
}

async function restablecerPassword(id, password) {
  await obtener(id);
  await repo.cambiarHash(id, await bcrypt.hash(password, 10));
}

async function cambiarActivo(id, activo, solicitanteId) {
  const actual = await obtener(id);
  await protegerUltimoAdmin(actual, actual.rol, activo, solicitanteId);
  await repo.cambiarActivo(id, activo);
  const usuario = await repo.obtener(id);
  const asignaciones = activo ? null : await repo.contarAsignaciones(id);
  return { usuario, asignacionesPendientes: asignaciones };
}

module.exports = { listar, obtener, crear, actualizar, restablecerPassword, cambiarActivo };
