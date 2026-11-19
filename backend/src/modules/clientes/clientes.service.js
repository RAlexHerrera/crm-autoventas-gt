/** Gestión de clientes (HU-02, HU-03, HU-15). */
const repo = require('./clientes.repository');
const usuariosRepo = require('../usuarios/usuarios.repository');
const { esVendedor, vendedorDeAlcance } = require('../../middleware/auth');
const { respuestaPaginada } = require('../../utils/paginacion');
const { noEncontrado, solicitudInvalida, conflicto, prohibido } = require('../../utils/errores');
const { normalizarEmail } = require('../../utils/texto');

async function listar(usuario, filtros) {
  const f = { ...filtros, vendedorId: vendedorDeAlcance(usuario, filtros.vendedorId) };
  const { datos, total } = await repo.listar(f);
  return respuestaPaginada(datos, total, filtros);
}

/**
 * Obtiene un cliente verificando el alcance del usuario. Un vendedor que
 * pide un cliente ajeno recibe 404 (no se revela que existe).
 */
async function obtener(usuario, id) {
  const cliente = await repo.obtener(id);
  if (!cliente || (esVendedor(usuario) && cliente.vendedorId !== usuario.id)) {
    throw noEncontrado('El cliente no existe o no está asignado a usted.');
  }
  return cliente;
}

async function resolverVendedor(usuario, vendedorIdSolicitado, vendedorActual) {
  if (esVendedor(usuario)) {
    if (vendedorIdSolicitado && vendedorIdSolicitado !== usuario.id) {
      throw prohibido('Solo el gerente o el administrador pueden asignar clientes a otro vendedor.');
    }
    return vendedorActual || usuario.id;
  }
  const vendedorId = vendedorIdSolicitado || vendedorActual;
  if (!vendedorId) throw solicitudInvalida('Seleccione el vendedor responsable del cliente.');
  if (!(await usuariosRepo.esVendedorActivo(vendedorId))) {
    throw solicitudInvalida('El vendedor seleccionado no existe o está inactivo.');
  }
  return vendedorId;
}

async function crear(usuario, datos) {
  const vendedorId = await resolverVendedor(usuario, datos.vendedorId);
  const id = await repo.crear({ ...datos, email: normalizarEmail(datos.email), vendedorId });
  return repo.obtener(id);
}

async function actualizar(usuario, id, datos) {
  const actual = await obtener(usuario, id);
  const vendedorId = await resolverVendedor(usuario, datos.vendedorId, actual.vendedorId);
  await repo.actualizar(id, { ...datos, email: normalizarEmail(datos.email), vendedorId });
  return repo.obtener(id);
}

async function eliminar(usuario, id) {
  await obtener(usuario, id);
  const rel = await repo.contarRelaciones(id);
  if (rel.oportunidades > 0 || rel.ventas > 0) {
    throw conflicto(
      'No se puede eliminar el cliente porque tiene oportunidades o ventas registradas. Puede clasificarlo como Inactivo.',
    );
  }
  await repo.eliminar(id);
}

module.exports = { listar, obtener, crear, actualizar, eliminar };
