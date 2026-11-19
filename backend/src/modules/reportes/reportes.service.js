/**
 * Reportes y dashboard gerencial (HU-11, HU-12, HU-13, HU-15).
 * Si no se indica rango se usan los últimos 12 meses (hora de Guatemala).
 */
const repo = require('./reportes.repository');
const { ETAPAS } = require('../oportunidades/oportunidades.repository');
const { solicitudInvalida } = require('../../utils/errores');

const ETAPAS_EMBUDO = ['Prospección', 'Contacto', 'Cotización', 'Negociación', 'Ganado'];

function hoyGt() {
  return new Date(Date.now() - 6 * 3600 * 1000).toISOString().slice(0, 10);
}

function normalizarRango({ desde, hasta }) {
  const fin = hasta || hoyGt();
  let inicio = desde;
  if (!inicio) {
    const d = new Date(`${fin}T00:00:00Z`);
    d.setUTCMonth(d.getUTCMonth() - 11);
    d.setUTCDate(1);
    inicio = d.toISOString().slice(0, 10);
  }
  if (inicio > fin) throw solicitudInvalida('La fecha inicial no puede ser posterior a la fecha final.');
  return { desde: inicio, hasta: fin };
}

/** Lista de meses AAAA-MM entre dos fechas (para rellenar con ceros las gráficas). */
function mesesEntre(desde, hasta) {
  const meses = [];
  const d = new Date(`${desde.slice(0, 7)}-01T00:00:00Z`);
  const fin = hasta.slice(0, 7);
  while (d.toISOString().slice(0, 7) <= fin && meses.length < 120) {
    meses.push(d.toISOString().slice(0, 7));
    d.setUTCMonth(d.getUTCMonth() + 1);
  }
  return meses;
}

async function ventasPorPeriodo(filtros) {
  const rango = normalizarRango(filtros);
  const agrupacion = filtros.agrupacion || 'mes';
  const filas = await repo.ventasPorPeriodo({ ...filtros, ...rango, agrupacion });
  const serie =
    agrupacion === 'mes'
      ? mesesEntre(rango.desde, rango.hasta).map(
          (periodo) => filas.find((f) => f.periodo === periodo) || { periodo, cantidad: 0, monto: 0 },
        )
      : filas;
  const totales = await repo.totalesVentas({ ...filtros, ...rango });
  return { ...rango, agrupacion, serie, totales };
}

async function rendimientoVendedores(filtros) {
  const rango = normalizarRango(filtros);
  return { ...rango, vendedores: await repo.rendimientoVendedores(rango) };
}

async function conversionProspectos(filtros) {
  const rango = normalizarRango(filtros);
  return { ...rango, ...(await repo.conversionProspectos({ ...filtros, ...rango })) };
}

async function vehiculosMasVendidos(filtros) {
  const rango = normalizarRango(filtros);
  return {
    ...rango,
    vehiculos: await repo.vehiculosMasVendidos({ ...filtros, ...rango, limite: filtros.limite || 10 }),
  };
}

/**
 * Funnel: cantidad actual por etapa y "acumulado" (cuántas oportunidades
 * llegaron AL MENOS a cada etapa, sin contar las perdidas).
 */
async function funnel(filtros) {
  const rango = normalizarRango(filtros);
  const filas = await repo.funnel({ ...filtros, ...rango });
  const etapas = ETAPAS.map((etapa) => {
    const f = filas.find((x) => x.etapa === etapa);
    return { etapa, cantidad: f ? f.cantidad : 0, monto: f ? f.monto : 0 };
  });
  const acumulado = ETAPAS_EMBUDO.map((etapa, i) => ({
    etapa,
    cantidad: etapas.filter((e) => ETAPAS_EMBUDO.indexOf(e.etapa) >= i).reduce((a, e) => a + e.cantidad, 0),
  }));
  const ganadas = etapas.find((e) => e.etapa === 'Ganado').cantidad;
  const perdidas = etapas.find((e) => e.etapa === 'Perdido').cantidad;
  return {
    ...rango,
    etapas,
    acumulado,
    total: etapas.reduce((a, e) => a + e.cantidad, 0),
    ganadas,
    perdidas,
    tasaCierre: ganadas + perdidas ? ganadas / (ganadas + perdidas) : 0,
  };
}

async function clasificacionClientes(filtros) {
  const datos = await repo.clasificacionClientes(filtros);
  const discrepancias = datos.clientes.filter(
    (c) => c.clasificacion !== c.sugerida && c.clasificacion !== 'VIP',
  );
  return { ...datos, discrepancias };
}

/** Dashboard del gerente: todo lo necesario en una sola llamada. */
async function dashboard(filtros) {
  const rango = normalizarRango(filtros);
  const f = { ...filtros, ...rango };
  const [ventas, indicadores, conversion, embudo, top, vendedores, clasificacion, proximos] =
    await Promise.all([
      ventasPorPeriodo(f),
      repo.indicadores(f),
      repo.conversionProspectos(f),
      funnel(f),
      repo.vehiculosMasVendidos({ ...f, limite: 5 }),
      filtros.vendedorId ? Promise.resolve([]) : repo.rendimientoVendedores(rango),
      repo.clasificacionClientes(f),
      repo.proximosCierres({ vendedorId: f.vendedorId }),
    ]);
  return {
    ...rango,
    kpis: {
      ventasCantidad: ventas.totales.cantidad,
      ventasMonto: ventas.totales.monto,
      unidadesVendidas: ventas.totales.unidades,
      ticketPromedio: ventas.totales.cantidad ? ventas.totales.monto / ventas.totales.cantidad : 0,
      tasaConversion: conversion.tasa,
      tasaCierre: embudo.tasaCierre,
      ...indicadores,
    },
    ventasPorMes: ventas.serie,
    funnel: embudo,
    conversion,
    topVehiculos: top.map((t) => ({ ...t, vehiculo: `${t.marca} ${t.modelo}` })),
    vendedores,
    clasificacionClientes: clasificacion.resumen,
    proximosCierres: proximos,
  };
}

module.exports = {
  normalizarRango,
  ventasPorPeriodo,
  rendimientoVendedores,
  conversionProspectos,
  vehiculosMasVendidos,
  funnel,
  clasificacionClientes,
  dashboard,
};
