/** Controlador HTTP de clientes. */
const servicio = require('./clientes.service');

const listar = async (req, res) => res.json(await servicio.listar(req.usuario, req.valido.query));
const obtener = async (req, res) => res.json(await servicio.obtener(req.usuario, req.valido.params.id));
const crear = async (req, res) => res.status(201).json(await servicio.crear(req.usuario, req.valido.body));
const actualizar = async (req, res) =>
  res.json(await servicio.actualizar(req.usuario, req.valido.params.id, req.valido.body));
async function eliminar(req, res) {
  await servicio.eliminar(req.usuario, req.valido.params.id);
  res.status(204).end();
}

module.exports = { listar, obtener, crear, actualizar, eliminar };
