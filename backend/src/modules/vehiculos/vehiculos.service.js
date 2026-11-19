/** Catálogo de vehículos e inventario (HU-07, HU-08). */
const repo = require('./vehiculos.repository');
const { respuestaPaginada } = require('../../utils/paginacion');
const { noEncontrado, conflicto, solicitudInvalida } = require('../../utils/errores');
const { digitoVerificadorValido } = require('../../utils/vin');

async function listar(filtros) {
  const { datos, total } = await repo.listar(filtros);
  return respuestaPaginada(datos, total, filtros);
}

async function obtener(id) {
  const v = await repo.obtener(id);
  if (!v) throw noEncontrado('El vehículo no existe.');
  return { ...v, vinDigitoVerificadorValido: digitoVerificadorValido(v.vin) };
}

function validarCoherencia(d) {
  if (d.condicion === 'Nuevo' && d.kilometraje > 500) {
    throw solicitudInvalida(
      'Un vehículo nuevo no puede tener más de 500 km recorridos. Márquelo como Usado.',
    );
  }
  const anioMaximo = new Date().getFullYear() + 1;
  if (d.anio > anioMaximo) throw solicitudInvalida(`El año del modelo no puede ser mayor que ${anioMaximo}.`);
}

async function crear(datos) {
  validarCoherencia(datos);
  const id = await repo.crear(datos);
  return obtener(id);
}

async function actualizar(id, datos) {
  const actual = await obtener(id);
  if (actual.estado === 'Vendido') throw conflicto('No se puede modificar un vehículo vendido.');
  validarCoherencia(datos);
  await repo.actualizar(id, datos);
  return obtener(id);
}

/**
 * Cambio manual de disponibilidad (gerente/admin). "Vendido" solo se asigna
 * al registrar una venta; un vehículo reservado por una cotización aceptada
 * se libera rechazando esa cotización.
 */
async function cambiarEstado(id, estado) {
  const actual = await obtener(id);
  if (actual.estado === 'Vendido') throw conflicto('El vehículo ya fue vendido; su estado no puede cambiar.');
  if (estado === 'Vendido')
    throw solicitudInvalida('El estado «Vendido» se asigna automáticamente al registrar la venta.');
  if (actual.reservadoCotizacionId && estado === 'Disponible') {
    throw conflicto(
      'El vehículo está reservado por una cotización aceptada. Para liberarlo, rechace o anule esa cotización.',
    );
  }
  await repo.cambiarEstado(id, estado, null);
  return obtener(id);
}

async function eliminar(id) {
  const actual = await obtener(id);
  if (actual.estado !== 'Disponible' || (await repo.contarCotizaciones(id)) > 0) {
    throw conflicto('No se puede eliminar: el vehículo ya fue cotizado, reservado o vendido.');
  }
  await repo.eliminar(id);
}

module.exports = { listar, obtener, crear, actualizar, cambiarEstado, eliminar };
