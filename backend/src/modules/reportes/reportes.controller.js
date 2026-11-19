/** Controlador HTTP de reportes. */
const servicio = require('./reportes.service');

const q = (req) => req.valido.query;

/** Panel del propio vendedor: mismo cálculo que el dashboard, filtrado a sus datos. */
const miPanel = async (req, res) =>
  res.json(await servicio.dashboard({ ...q(req), vendedorId: req.usuario.id }));

module.exports = {
  dashboard: async (req, res) => res.json(await servicio.dashboard(q(req))),
  ventasPorPeriodo: async (req, res) => res.json(await servicio.ventasPorPeriodo(q(req))),
  rendimientoVendedores: async (req, res) => res.json(await servicio.rendimientoVendedores(q(req))),
  conversionProspectos: async (req, res) => res.json(await servicio.conversionProspectos(q(req))),
  vehiculosMasVendidos: async (req, res) => res.json(await servicio.vehiculosMasVendidos(q(req))),
  funnel: async (req, res) => res.json(await servicio.funnel(q(req))),
  clasificacionClientes: async (req, res) => res.json(await servicio.clasificacionClientes(q(req))),
  miPanel,
};
