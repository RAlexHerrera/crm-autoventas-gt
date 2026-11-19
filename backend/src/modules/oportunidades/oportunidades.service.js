/** Oportunidades y seguimiento por etapas del embudo (HU-06). */
const repo = require('./oportunidades.repository');
const clientesServicio = require('../clientes/clientes.service');
const prospectosServicio = require('../prospectos/prospectos.service');
const usuariosRepo = require('../usuarios/usuarios.repository');
const vehiculosRepo = require('../vehiculos/vehiculos.repository');
const cotizacionesRepo = require('../cotizaciones/cotizaciones.repository');
const interaccionesRepo = require('../interacciones/interacciones.repository');
const { enTransaccion } = require('../../db/pool');
const { esVendedor, vendedorDeAlcance } = require('../../middleware/auth');
const { respuestaPaginada } = require('../../utils/paginacion');
const { noEncontrado, solicitudInvalida, conflicto } = require('../../utils/errores');

const CERRADAS = ['Ganado', 'Perdido'];

async function listar(usuario, filtros) {
  const f = { ...filtros, vendedorId: vendedorDeAlcance(usuario, filtros.vendedorId) };
  const { datos, total } = await repo.listar(f);
  return respuestaPaginada(datos, total, filtros);
}

async function obtenerBasica(usuario, id) {
  const op = await repo.obtener(id);
  if (!op || (esVendedor(usuario) && op.vendedorId !== usuario.id)) {
    throw noEncontrado('La oportunidad no existe o no está asignada a usted.');
  }
  return op;
}

async function obtener(usuario, id) {
  const op = await obtenerBasica(usuario, id);
  const cotizaciones = await cotizacionesRepo.listarPorOportunidad(id);
  return { ...op, cotizaciones };
}

async function resumen(usuario, vendedorId) {
  return repo.resumenPorEtapa(vendedorDeAlcance(usuario, vendedorId));
}

async function validarVehiculo(vehiculoId) {
  if (!vehiculoId) return;
  if (!(await vehiculosRepo.obtener(vehiculoId)))
    throw solicitudInvalida('El vehículo de interés no existe.');
}

async function crear(usuario, datos) {
  if (!datos.prospectoId && !datos.clienteId) {
    throw solicitudInvalida('Indique el prospecto o el cliente de la oportunidad.');
  }
  let vendedorPorDefecto;
  const { prospectoId } = datos;
  let { clienteId } = datos;
  if (clienteId) {
    const cliente = await clientesServicio.obtener(usuario, clienteId);
    vendedorPorDefecto = cliente.vendedorId;
  }
  if (prospectoId) {
    const p = await prospectosServicio.obtener(usuario, prospectoId);
    if (p.estado === 'Descartado')
      throw conflicto('No se pueden crear oportunidades para un prospecto descartado.');
    if (p.clienteId) clienteId = clienteId || p.clienteId; // ya convertido: se vincula también al cliente
    vendedorPorDefecto = vendedorPorDefecto || p.vendedorId;
  }
  await validarVehiculo(datos.vehiculoInteresId);

  let vendedorId = esVendedor(usuario) ? usuario.id : datos.vendedorId || vendedorPorDefecto;
  if (!esVendedor(usuario) && !(await usuariosRepo.esVendedorActivo(vendedorId))) {
    throw solicitudInvalida('El vendedor seleccionado no existe o está inactivo.');
  }
  vendedorId = Number(vendedorId);

  const id = await repo.crear({
    ...datos,
    prospectoId,
    clienteId,
    vendedorId,
    etapa: datos.etapa || 'Prospección',
  });
  return repo.obtener(id);
}

async function actualizar(usuario, id, datos) {
  const op = await obtenerBasica(usuario, id);
  if (CERRADAS.includes(op.etapa)) throw conflicto('La oportunidad está cerrada y no se puede modificar.');
  await validarVehiculo(datos.vehiculoInteresId);
  await repo.actualizar(id, datos);
  return repo.obtener(id);
}

/**
 * Cambio manual de etapa. "Ganado" solo se asigna al registrar la venta (HU-10).
 * Al marcar "Perdido" se rechazan las cotizaciones abiertas y se liberan los
 * vehículos reservados, todo en una transacción.
 */
async function cambiarEtapa(usuario, id, { etapa, motivoPerdida }) {
  const op = await obtenerBasica(usuario, id);
  if (etapa === 'Ganado') {
    throw solicitudInvalida('La etapa «Ganado» se asigna automáticamente al registrar la venta.');
  }
  if (CERRADAS.includes(op.etapa)) throw conflicto(`La oportunidad ya está cerrada como «${op.etapa}».`);
  if (etapa === op.etapa) return op;
  if (etapa === 'Perdido' && !motivoPerdida) {
    throw solicitudInvalida('Indique el motivo por el que se perdió la oportunidad.');
  }

  await enTransaccion(async (conn) => {
    await repo.obtener(id, conn, true);
    if (etapa === 'Perdido') await cotizacionesRepo.rechazarAbiertasDeOportunidad(id, conn);
    await repo.cambiarEtapa(id, etapa, motivoPerdida, conn);
    await interaccionesRepo.crear(
      {
        clienteId: op.clienteId,
        prospectoId: op.prospectoId,
        oportunidadId: id,
        usuarioId: usuario.id,
        tipo: 'Sistema',
        descripcion:
          `Etapa cambiada de «${op.etapa}» a «${etapa}».` +
          (etapa === 'Perdido' ? ` Motivo: ${motivoPerdida}` : ''),
      },
      conn,
    );
  });
  return repo.obtener(id);
}

async function asignar(usuario, id, vendedorId) {
  const op = await obtenerBasica(usuario, id);
  if (CERRADAS.includes(op.etapa)) throw conflicto('La oportunidad está cerrada y no se puede reasignar.');
  if (!(await usuariosRepo.esVendedorActivo(vendedorId))) {
    throw solicitudInvalida('El vendedor seleccionado no existe o está inactivo.');
  }
  await repo.asignar(id, vendedorId);
  return repo.obtener(id);
}

module.exports = { listar, obtener, resumen, crear, actualizar, cambiarEtapa, asignar };
