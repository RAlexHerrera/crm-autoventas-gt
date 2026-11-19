/** Controlador HTTP de ventas. */
const servicio = require('./ventas.service');

const listar = async (req, res) => res.json(await servicio.listar(req.usuario, req.valido.query));
const obtener = async (req, res) => res.json(await servicio.obtener(req.usuario, req.valido.params.id));
const registrar = async (req, res) =>
  res.status(201).json(await servicio.registrar(req.usuario, req.valido.body));

module.exports = { listar, obtener, registrar };
