/**
 * Ventas (HU-10): conversión de una cotización ACEPTADA en venta mediante UNA
 * transacción. Dentro de ella:
 *   1. Se bloquean (SELECT ... FOR UPDATE) la cotización, sus vehículos y la oportunidad.
 *   2. Se valida que la cotización siga "Aceptada", que no tenga venta y que
 *      ningún vehículo esté vendido ni reservado por otra cotización.
 *   3. Se vincula el cliente o se convierte el prospecto en cliente.
 *   4. Se registra la venta y sus vehículos; vehículos → "Vendido";
 *      cotización → "Convertida"; oportunidad → "Ganado".
 * Si cualquier paso falla se hace ROLLBACK total. Dos solicitudes simultáneas
 * sobre la misma cotización se serializan por el bloqueo de fila: la segunda
 * encuentra la cotización "Convertida" y recibe 409.
 */
const repo = require('./ventas.repository');
const cotizacionesRepo = require('../cotizaciones/cotizaciones.repository');
const vehiculosRepo = require('../vehiculos/vehiculos.repository');
const oportunidadesRepo = require('../oportunidades/oportunidades.repository');
const clientesRepo = require('../clientes/clientes.repository');
const interaccionesRepo = require('../interacciones/interacciones.repository');
const prospectosServicio = require('../prospectos/prospectos.service');
const { enTransaccion } = require('../../db/pool');
const { esVendedor, vendedorDeAlcance } = require('../../middleware/auth');
const { siguienteCorrelativo } = require('../../utils/correlativos');
const { respuestaPaginada } = require('../../utils/paginacion');
const { noEncontrado, conflicto } = require('../../utils/errores');

async function listar(usuario, filtros) {
  const f = { ...filtros, vendedorId: vendedorDeAlcance(usuario, filtros.vendedorId) };
  const { datos, total, montoTotal } = await repo.listar(f);
  return { ...respuestaPaginada(datos, total, filtros), montoTotal };
}

async function obtener(usuario, id) {
  const venta = await repo.obtener(id);
  if (!venta || (esVendedor(usuario) && venta.vendedorId !== usuario.id)) {
    throw noEncontrado('La venta no existe o no está asignada a usted.');
  }
  return venta;
}

async function registrar(usuario, datos) {
  const ventaId = await enTransaccion(async (conn) => {
    // 1. Bloqueo de la cotización: serializa solicitudes concurrentes.
    const cot = await cotizacionesRepo.bloquear(datos.cotizacionId, conn);
    if (!cot || (esVendedor(usuario) && cot.vendedorId !== usuario.id)) {
      throw noEncontrado('La cotización no existe o no está asignada a usted.');
    }
    if (cot.estado === 'Convertida' || (await repo.existePorCotizacion(cot.id, conn))) {
      throw conflicto(`La cotización ${cot.correlativo} ya fue convertida en venta.`);
    }
    if (cot.estado !== 'Aceptada') {
      throw conflicto(
        `Solo se pueden convertir en venta cotizaciones aceptadas. La cotización ${cot.correlativo} está «${cot.estado}».`,
      );
    }

    // 2. Bloqueo y verificación de los vehículos.
    const lineas = await cotizacionesRepo.obtenerLineas(cot.id, conn);
    const ids = lineas.map((l) => l.vehiculoId);
    const vehiculos = await vehiculosRepo.bloquearVarios(ids, conn);
    for (const v of vehiculos) {
      if (v.estado === 'Vendido') {
        throw conflicto(`El vehículo ${v.marca} ${v.modelo} (VIN ${v.vin}) ya fue vendido.`);
      }
      if (v.estado === 'Reservado' && v.reservadoCotizacionId !== cot.id) {
        throw conflicto(
          `El vehículo ${v.marca} ${v.modelo} (VIN ${v.vin}) está reservado por otra cotización.`,
        );
      }
    }

    // 3. Cliente: el de la oportunidad o el prospecto convertido en cliente.
    const op = await oportunidadesRepo.obtener(cot.oportunidadId, conn, true);
    const clienteId =
      op.clienteId ||
      (await prospectosServicio.convertirEnCliente(conn, op.prospectoId, datos.cliente, usuario.id));

    // 4. Registro de la venta y actualización de inventario, cotización y oportunidad.
    const correlativo = await siguienteCorrelativo(conn, 'VTA');
    const id = await repo.insertarVenta(
      {
        correlativo,
        cotizacionId: cot.id,
        clienteId,
        vendedorId: cot.vendedorId,
        metodoPago: datos.metodoPago,
        total: cot.total,
        observaciones: datos.observaciones,
        registradoPor: usuario.id,
      },
      conn,
    );
    await repo.registrarVehiculosVendidos(id, lineas, conn);
    await vehiculosRepo.cambiarEstado(ids, 'Vendido', cot.id, conn);
    await cotizacionesRepo.cambiarEstado(cot.id, 'Convertida', conn);
    await oportunidadesRepo.cambiarEtapa(op.id, 'Ganado', null, conn);
    await clientesRepo.reclasificarPorCompras(clienteId, conn);
    await interaccionesRepo.crear(
      {
        clienteId,
        prospectoId: op.prospectoId,
        oportunidadId: op.id,
        usuarioId: usuario.id,
        tipo: 'Sistema',
        descripcion: `Venta ${correlativo} registrada a partir de la cotización ${cot.correlativo}.`,
      },
      conn,
    );
    return id;
  });
  return repo.obtener(ventaId);
}

module.exports = { listar, obtener, registrar };
