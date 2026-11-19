/**
 * Cálculos monetarios de cotizaciones (HU-09).
 * Se trabaja en centavos (enteros) para evitar errores de punto flotante.
 *
 * Regla (supuesto S8 y docs/DECISIONES.md):
 *   subtotal       = Σ precio de lista de cada vehículo
 *   descuento      = Σ descuento por línea (0 ≤ descuento ≤ precio)
 *   base imponible = subtotal − descuento
 *   IVA            = base imponible × 12 %  (redondeo a 2 decimales, mitad hacia arriba)
 *   total          = base imponible + IVA
 */
const { solicitudInvalida } = require('./errores');

const aCentavos = (q) => Math.round(Number(q) * 100);
const aQuetzales = (c) => c / 100;

/**
 * @param {{precio:number, descuento?:number}[]} lineas
 * @param {number} ivaPuntosBasicos 1200 = 12 %
 */
function calcularTotales(lineas, ivaPuntosBasicos = 1200) {
  if (!Array.isArray(lineas) || lineas.length === 0) {
    throw solicitudInvalida('La cotización debe incluir al menos un vehículo.');
  }
  let subtotalC = 0;
  let descuentoC = 0;
  const detalle = lineas.map((l, i) => {
    const precioC = aCentavos(l.precio);
    const descC = aCentavos(l.descuento || 0);
    if (!(precioC > 0)) throw solicitudInvalida(`El precio de la línea ${i + 1} debe ser mayor que cero.`);
    if (descC < 0) throw solicitudInvalida(`El descuento de la línea ${i + 1} no puede ser negativo.`);
    if (descC > precioC) {
      throw solicitudInvalida(
        `El descuento de la línea ${i + 1} no puede ser mayor que el precio del vehículo.`,
      );
    }
    subtotalC += precioC;
    descuentoC += descC;
    return {
      ...l,
      precio: aQuetzales(precioC),
      descuento: aQuetzales(descC),
      subtotal: aQuetzales(precioC - descC),
    };
  });
  const baseC = subtotalC - descuentoC;
  // Entero × entero / 10000 con redondeo: sin errores de coma flotante.
  const ivaC = Math.round((baseC * ivaPuntosBasicos) / 10000);
  return {
    lineas: detalle,
    subtotal: aQuetzales(subtotalC),
    descuento: aQuetzales(descuentoC),
    baseImponible: aQuetzales(baseC),
    ivaTasa: ivaPuntosBasicos / 10000,
    iva: aQuetzales(ivaC),
    total: aQuetzales(baseC + ivaC),
  };
}

module.exports = { calcularTotales, aCentavos, aQuetzales };
