/**
 * Autenticación (JWT) y autorización por rol. Los permisos SIEMPRE se
 * validan aquí en el backend; ocultar botones en Angular es solo comodidad.
 */
const jwt = require('jsonwebtoken');
const config = require('../config/env');
const { pool } = require('../db/pool');
const { noAutenticado, prohibido } = require('../utils/errores');

const ROLES = Object.freeze({ ADMIN: 'ADMIN', GERENTE: 'GERENTE', VENDEDOR: 'VENDEDOR' });

/** Firma un JWT con los datos mínimos del usuario (sin datos sensibles). */
function firmarToken(usuario) {
  return jwt.sign({ sub: usuario.id, rol: usuario.rol }, config.jwt.secreto, {
    expiresIn: config.jwt.expiraEn,
  });
}

/**
 * Verifica el token Bearer y que el usuario siga activo. Deja en
 * `req.usuario` { id, nombre, email, rol }.
 */
async function autenticar(req, _res, next) {
  const encabezado = req.headers.authorization || '';
  const [tipo, token] = encabezado.split(' ');
  if (tipo !== 'Bearer' || !token) return next(noAutenticado());

  let payload;
  try {
    payload = jwt.verify(token, config.jwt.secreto);
  } catch (error) {
    const mensaje =
      error.name === 'TokenExpiredError'
        ? 'Su sesión expiró. Inicie sesión nuevamente.'
        : 'Sesión inválida. Inicie sesión nuevamente.';
    return next(noAutenticado(mensaje));
  }

  // Se consulta la BD para reflejar al instante desactivaciones o cambios de rol.
  const [filas] = await pool.query(
    `SELECT u.id, u.nombre, u.email, u.activo, r.codigo AS rol
       FROM usuarios u JOIN roles r ON r.id = u.rol_id
      WHERE u.id = ?`,
    [payload.sub],
  );
  const usuario = filas[0];
  if (!usuario || !usuario.activo) return next(noAutenticado('Su usuario está inactivo o ya no existe.'));

  req.usuario = { id: usuario.id, nombre: usuario.nombre, email: usuario.email, rol: usuario.rol };
  return next();
}

/** Permite el acceso solo a los roles indicados. */
function autorizar(...rolesPermitidos) {
  return (req, _res, next) => {
    if (!req.usuario) return next(noAutenticado());
    if (!rolesPermitidos.includes(req.usuario.rol)) return next(prohibido());
    return next();
  };
}

/** ¿El usuario solo puede ver lo suyo? (vendedor) */
const esVendedor = (usuario) => usuario.rol === ROLES.VENDEDOR;

/**
 * Devuelve el id de vendedor con el que hay que filtrar los datos:
 * el propio id si es vendedor; el filtro solicitado (o null = todos) si es gerente/admin.
 */
function vendedorDeAlcance(usuario, vendedorSolicitado) {
  if (esVendedor(usuario)) return usuario.id;
  return vendedorSolicitado || null;
}

module.exports = { ROLES, firmarToken, autenticar, autorizar, esVendedor, vendedorDeAlcance };
