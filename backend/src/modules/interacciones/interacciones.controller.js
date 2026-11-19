/** Controlador HTTP de interacciones. */
const servicio = require('./interacciones.service');

const listar = async (req, res) => res.json(await servicio.listar(req.usuario, req.valido.query));
const crear = async (req, res) => res.status(201).json(await servicio.crear(req.usuario, req.valido.body));

module.exports = { listar, crear };
