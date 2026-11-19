/** Controlador HTTP de vehículos. */
const servicio = require('./vehiculos.service');
const repo = require('./vehiculos.repository');
const s = require('./vehiculos.schemas');

const listar = async (req, res) => res.json(await servicio.listar(req.valido.query));
const obtener = async (req, res) => res.json(await servicio.obtener(req.valido.params.id));
const crear = async (req, res) => res.status(201).json(await servicio.crear(req.valido.body));
const actualizar = async (req, res) =>
  res.json(await servicio.actualizar(req.valido.params.id, req.valido.body));
const cambiarEstado = async (req, res) =>
  res.json(await servicio.cambiarEstado(req.valido.params.id, req.valido.body.estado));
async function eliminar(req, res) {
  await servicio.eliminar(req.valido.params.id);
  res.status(204).end();
}
const inventario = async (_req, res) => res.json(await repo.resumenInventario());

/** Catálogos para llenar filtros y formularios en la interfaz. */
const catalogos = async (_req, res) =>
  res.json({
    marcas: await repo.marcas(),
    tipos: s.TIPOS,
    condiciones: s.CONDICIONES,
    transmisiones: s.TRANSMISIONES,
    combustibles: s.COMBUSTIBLES,
    estados: s.ESTADOS,
  });

module.exports = { listar, obtener, crear, actualizar, cambiarEstado, eliminar, inventario, catalogos };
