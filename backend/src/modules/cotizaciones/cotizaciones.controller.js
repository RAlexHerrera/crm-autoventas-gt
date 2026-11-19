/** Controlador HTTP de cotizaciones. */
const servicio = require('./cotizaciones.service');
const { generarPdfCotizacion } = require('./cotizaciones.pdf');

const listar = async (req, res) => res.json(await servicio.listar(req.usuario, req.valido.query));
const obtener = async (req, res) => res.json(await servicio.obtener(req.usuario, req.valido.params.id));
const crear = async (req, res) => res.status(201).json(await servicio.crear(req.usuario, req.valido.body));
const actualizar = async (req, res) =>
  res.json(await servicio.actualizar(req.usuario, req.valido.params.id, req.valido.body));
const cambiarEstado = async (req, res) =>
  res.json(await servicio.cambiarEstado(req.usuario, req.valido.params.id, req.valido.body));
async function eliminar(req, res) {
  await servicio.eliminar(req.usuario, req.valido.params.id);
  res.status(204).end();
}

/** HU-14: descarga de la cotización en PDF (respeta el alcance del usuario). */
async function pdf(req, res) {
  const cot = await servicio.obtener(req.usuario, req.valido.params.id);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${cot.correlativo}.pdf"`);
  generarPdfCotizacion(cot, res);
}

module.exports = { listar, obtener, crear, actualizar, cambiarEstado, eliminar, pdf };
