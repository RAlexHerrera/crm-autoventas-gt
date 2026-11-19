/** Controlador HTTP de usuarios. */
const servicio = require('./usuarios.service');
const repo = require('./usuarios.repository');

async function listar(req, res) {
  res.json(await servicio.listar(req.valido.query));
}

async function obtener(req, res) {
  res.json(await servicio.obtener(req.valido.params.id));
}

async function vendedores(_req, res) {
  res.json(await repo.listarVendedoresActivos());
}

async function crear(req, res) {
  res.status(201).json(await servicio.crear(req.valido.body));
}

async function actualizar(req, res) {
  res.json(await servicio.actualizar(req.valido.params.id, req.valido.body, req.usuario.id));
}

async function restablecerPassword(req, res) {
  await servicio.restablecerPassword(req.valido.params.id, req.valido.body.password);
  res.json({ mensaje: 'Contraseña restablecida correctamente.' });
}

async function cambiarActivo(req, res) {
  res.json(await servicio.cambiarActivo(req.valido.params.id, req.valido.body.activo, req.usuario.id));
}

module.exports = { listar, obtener, vendedores, crear, actualizar, restablecerPassword, cambiarActivo };
