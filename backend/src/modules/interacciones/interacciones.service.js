/** Historial de interacciones con clientes y prospectos (HU-03). */
const repo = require('./interacciones.repository');
const clientesServicio = require('../clientes/clientes.service');
const prospectosServicio = require('../prospectos/prospectos.service');
const oportunidadesRepo = require('../oportunidades/oportunidades.repository');
const { esVendedor } = require('../../middleware/auth');
const { solicitudInvalida, noEncontrado } = require('../../utils/errores');

/** Verifica que el usuario tenga acceso al cliente/prospecto/oportunidad indicados. */
async function verificarAcceso(usuario, { clienteId, prospectoId, oportunidadId }) {
  if (clienteId) await clientesServicio.obtener(usuario, clienteId);
  if (prospectoId) await prospectosServicio.obtener(usuario, prospectoId);
  if (oportunidadId) {
    const op = await oportunidadesRepo.obtener(oportunidadId);
    if (!op || (esVendedor(usuario) && op.vendedorId !== usuario.id)) {
      throw noEncontrado('La oportunidad no existe o no está asignada a usted.');
    }
    return op;
  }
  return null;
}

async function listar(usuario, filtros) {
  await verificarAcceso(usuario, filtros);
  // Si se consulta un cliente que provino de un prospecto, se incluye el historial previo.
  if (filtros.clienteId && !filtros.prospectoId) {
    const cliente = await clientesServicio.obtener(usuario, filtros.clienteId);
    if (cliente.prospectoOrigenId) filtros = { ...filtros, prospectoId: cliente.prospectoOrigenId };
  }
  return repo.listar(filtros);
}

async function crear(usuario, datos) {
  if (!datos.clienteId && !datos.prospectoId) {
    throw solicitudInvalida('Indique el cliente o el prospecto de la interacción.');
  }
  const op = await verificarAcceso(usuario, datos);
  if (op) {
    const pertenece =
      (datos.clienteId && op.clienteId === datos.clienteId) ||
      (datos.prospectoId && op.prospectoId === datos.prospectoId);
    if (!pertenece) throw solicitudInvalida('La oportunidad no pertenece al cliente o prospecto indicado.');
  }
  const id = await repo.crear({ ...datos, usuarioId: usuario.id });
  return repo.obtener(id);
}

module.exports = { listar, crear };
