/** Controlador HTTP de oportunidades. */
const servicio = require('./oportunidades.service');

const listar = async (req, res) => res.json(await servicio.listar(req.usuario, req.valido.query));
const resumen = async (req, res) =>
  res.json(await servicio.resumen(req.usuario, req.valido.query.vendedorId));
const obtener = async (req, res) => res.json(await servicio.obtener(req.usuario, req.valido.params.id));
const crear = async (req, res) => res.status(201).json(await servicio.crear(req.usuario, req.valido.body));
const actualizar = async (req, res) =>
  res.json(await servicio.actualizar(req.usuario, req.valido.params.id, req.valido.body));
const cambiarEtapa = async (req, res) =>
  res.json(await servicio.cambiarEtapa(req.usuario, req.valido.params.id, req.valido.body));
const asignar = async (req, res) =>
  res.json(await servicio.asignar(req.usuario, req.valido.params.id, req.valido.body.vendedorId));

module.exports = { listar, resumen, obtener, crear, actualizar, cambiarEtapa, asignar };
