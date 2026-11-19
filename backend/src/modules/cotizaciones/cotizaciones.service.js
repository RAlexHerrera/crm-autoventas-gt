/**
 * Cotizaciones (HU-09): correlativo único, detalle de vehículos, subtotal,
 * descuentos, IVA 12 % y total; estados y seguimiento de ofertas.
 */
const repo = require('./cotizaciones.repository');
const oportunidadesRepo = require('../oportunidades/oportunidades.repository');
const vehiculosRepo = require('../vehiculos/vehiculos.repository');
const interaccionesRepo = require('../interacciones/interacciones.repository');
const { enTransaccion } = require('../../db/pool');
const { esVendedor, vendedorDeAlcance } = require('../../middleware/auth');
const { calcularTotales } = require('../../utils/calculos');
const { siguienteCorrelativo } = require('../../utils/correlativos');
const { respuestaPaginada } = require('../../utils/paginacion');
const { noEncontrado, solicitudInvalida, conflicto } = require('../../utils/errores');
const config = require('../../config/env');

/** Transiciones de estado permitidas manualmente. "Convertida" solo la asigna la venta. */
const TRANSICIONES = {
  Borrador: ['Enviada'],
  Enviada: ['Aceptada', 'Rechazada'],
  Aceptada: ['Rechazada'],
  Rechazada: [],
  Vencida: [],
  Convertida: [],
};

const ETAPAS_PREVIAS_COTIZACION = ['Prospección', 'Contacto'];
const ETAPAS_PREVIAS_NEGOCIACION = ['Prospección', 'Contacto', 'Cotización'];

function fechaMasDias(dias) {
  // Fecha local de Guatemala (UTC-6) en formato AAAA-MM-DD.
  const ahoraGt = new Date(Date.now() - 6 * 3600 * 1000);
  ahoraGt.setUTCDate(ahoraGt.getUTCDate() + dias);
  return ahoraGt.toISOString().slice(0, 10);
}

function verificarAlcance(usuario, cot) {
  if (!cot || (esVendedor(usuario) && cot.vendedorId !== usuario.id)) {
    throw noEncontrado('La cotización no existe o no está asignada a usted.');
  }
}

async function listar(usuario, filtros) {
  await repo.marcarVencidas();
  const f = { ...filtros, vendedorId: vendedorDeAlcance(usuario, filtros.vendedorId) };
  const { datos, total } = await repo.listar(f);
  return respuestaPaginada(datos, total, filtros);
}

async function obtener(usuario, id) {
  await repo.marcarVencidas();
  const cot = await repo.obtener(id);
  verificarAlcance(usuario, cot);
  return { ...cot, lineas: await repo.obtenerLineas(id) };
}

/**
 * Bloquea los vehículos y verifica que existan y estén disponibles.
 * Rechaza la operación (409) si alguno no está disponible.
 */
async function bloquearVehiculosDisponibles(conn, lineas) {
  const ids = lineas.map((l) => l.vehiculoId);
  const vehiculos = await vehiculosRepo.bloquearVarios(ids, conn);
  const faltantes = ids.filter((id) => !vehiculos.some((v) => v.id === id));
  if (faltantes.length) throw solicitudInvalida(`No existe el vehículo con id ${faltantes.join(', ')}.`);
  const noDisponibles = vehiculos.filter((v) => v.estado !== 'Disponible');
  if (noDisponibles.length) {
    throw conflicto(
      `No se puede cotizar: ${noDisponibles
        .map((v) => `${v.marca} ${v.modelo} ${v.anio} (VIN ${v.vin}) está ${v.estado.toLowerCase()}`)
        .join('; ')}.`,
      {
        vehiculosNoDisponibles: noDisponibles.map((v) => ({ id: v.id, vin: v.vin, estado: v.estado })),
      },
    );
  }
  return vehiculos;
}

function armarLineas(lineas, vehiculos) {
  // El precio SIEMPRE se toma del catálogo; el usuario solo define el descuento.
  return lineas.map((l) => ({
    vehiculoId: l.vehiculoId,
    precio: vehiculos.find((v) => v.id === l.vehiculoId).precio,
    descuento: l.descuento || 0,
  }));
}

async function registrarSistema(conn, op, usuarioId, descripcion) {
  await interaccionesRepo.crear(
    {
      clienteId: op.clienteId,
      prospectoId: op.prospectoId,
      oportunidadId: op.id,
      usuarioId,
      tipo: 'Sistema',
      descripcion,
    },
    conn,
  );
}

function validarVigencia(vigenciaHasta) {
  if (vigenciaHasta && vigenciaHasta < fechaMasDias(0)) {
    throw solicitudInvalida('La fecha de vigencia no puede ser anterior a hoy.');
  }
}

async function crear(usuario, datos) {
  validarVigencia(datos.vigenciaHasta);
  const id = await enTransaccion(async (conn) => {
    const op = await oportunidadesRepo.obtener(datos.oportunidadId, conn, true);
    if (!op || (esVendedor(usuario) && op.vendedorId !== usuario.id)) {
      throw noEncontrado('La oportunidad no existe o no está asignada a usted.');
    }
    if (['Ganado', 'Perdido'].includes(op.etapa)) {
      throw conflicto('No se puede cotizar sobre una oportunidad cerrada.');
    }
    const vehiculos = await bloquearVehiculosDisponibles(conn, datos.lineas);
    const totales = calcularTotales(armarLineas(datos.lineas, vehiculos), config.ivaPuntosBasicos);
    const correlativo = await siguienteCorrelativo(conn, 'COT');
    const nuevaId = await repo.crear(
      {
        correlativo,
        oportunidadId: op.id,
        vendedorId: op.vendedorId,
        vigenciaHasta: datos.vigenciaHasta || fechaMasDias(config.vigenciaCotizacionDias),
        totales,
        observaciones: datos.observaciones,
      },
      conn,
    );
    await repo.reemplazarLineas(nuevaId, totales.lineas, conn);
    if (ETAPAS_PREVIAS_COTIZACION.includes(op.etapa)) {
      await oportunidadesRepo.cambiarEtapa(op.id, 'Cotización', null, conn);
    }
    await registrarSistema(
      conn,
      op,
      usuario.id,
      `Cotización ${correlativo} creada por ${formatoQ(totales.total)}.`,
    );
    return nuevaId;
  });
  return obtener(usuario, id);
}

async function actualizar(usuario, id, datos) {
  validarVigencia(datos.vigenciaHasta);
  await enTransaccion(async (conn) => {
    const cot = await repo.bloquear(id, conn);
    verificarAlcance(usuario, cot);
    if (cot.estado !== 'Borrador') throw conflicto('Solo se pueden editar cotizaciones en estado Borrador.');
    const vehiculos = await bloquearVehiculosDisponibles(conn, datos.lineas);
    const totales = calcularTotales(armarLineas(datos.lineas, vehiculos), config.ivaPuntosBasicos);
    await repo.actualizarEncabezado(
      id,
      {
        vigenciaHasta: datos.vigenciaHasta || cot.vigenciaHasta,
        totales,
        observaciones: datos.observaciones,
      },
      conn,
    );
    await repo.reemplazarLineas(id, totales.lineas, conn);
  });
  return obtener(usuario, id);
}

/**
 * Cambia el estado de la cotización según TRANSICIONES.
 * - Aceptada: verifica vigencia y disponibilidad, y RESERVA los vehículos.
 * - Rechazada desde Aceptada: libera los vehículos reservados.
 */
async function cambiarEstado(usuario, id, { estado, comentario }) {
  await repo.marcarVencidas();
  await enTransaccion(async (conn) => {
    const cot = await repo.bloquear(id, conn);
    verificarAlcance(usuario, cot);
    if (estado === 'Convertida') {
      throw solicitudInvalida('Para convertir la cotización en venta use la opción «Registrar venta».');
    }
    if (!TRANSICIONES[cot.estado].includes(estado)) {
      throw conflicto(`No se puede pasar una cotización de «${cot.estado}» a «${estado}».`);
    }
    const op = await oportunidadesRepo.obtener(cot.oportunidadId, conn, true);

    if (estado === 'Aceptada') {
      if (cot.vencida) throw conflicto('La cotización está vencida; genere una nueva.');
      const lineas = await repo.obtenerLineas(id, conn);
      const ids = lineas.map((l) => l.vehiculoId);
      await bloquearVehiculosDisponibles(conn, lineas);
      await vehiculosRepo.cambiarEstado(ids, 'Reservado', id, conn);
      if (ETAPAS_PREVIAS_NEGOCIACION.includes(op.etapa)) {
        await oportunidadesRepo.cambiarEtapa(op.id, 'Negociación', null, conn);
      }
    }
    if (estado === 'Rechazada' && cot.estado === 'Aceptada') {
      await conn.query(
        `UPDATE vehiculos SET estado = 'Disponible', reservado_cotizacion_id = NULL
          WHERE reservado_cotizacion_id = ? AND estado = 'Reservado'`,
        [id],
      );
    }
    await repo.cambiarEstado(id, estado, conn);
    await registrarSistema(
      conn,
      op,
      usuario.id,
      `Cotización ${cot.correlativo}: «${cot.estado}» → «${estado}».${comentario ? ` ${comentario}` : ''}`,
    );
  });
  return obtener(usuario, id);
}

async function eliminar(usuario, id) {
  const cot = await repo.obtener(id);
  verificarAlcance(usuario, cot);
  if (cot.estado !== 'Borrador') {
    throw conflicto(
      'Solo se pueden eliminar cotizaciones en Borrador; las demás se conservan como historial.',
    );
  }
  await repo.eliminar(id);
}

function formatoQ(n) {
  return `Q${Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

module.exports = { TRANSICIONES, listar, obtener, crear, actualizar, cambiarEstado, eliminar };
