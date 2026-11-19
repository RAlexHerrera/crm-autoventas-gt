/**
 * Pruebas unitarias del cálculo de cotizaciones (HU-09):
 * subtotal, descuentos, IVA 12 % (supuesto S8) y total.
 */
const { calcularTotales } = require('../../src/utils/calculos');

describe('calcularTotales (HU-09)', () => {
  test('una línea con descuento: base = precio − descuento, IVA 12 %, total = base + IVA', () => {
    const r = calcularTotales([{ precio: 289900, descuento: 4900 }]);
    expect(r).toMatchObject({
      subtotal: 289900,
      descuento: 4900,
      baseImponible: 285000,
      ivaTasa: 0.12,
      iva: 34200,
      total: 319200,
    });
    expect(r.lineas[0].subtotal).toBe(285000);
  });

  test('varias líneas suman subtotal y descuentos', () => {
    const r = calcularTotales([
      { precio: 259000, descuento: 4000 },
      { precio: 249900, descuento: 4900 },
    ]);
    expect(r.subtotal).toBe(508900);
    expect(r.descuento).toBe(8900);
    expect(r.baseImponible).toBe(500000);
    expect(r.iva).toBe(60000);
    expect(r.total).toBe(560000);
  });

  test('sin descuento', () => {
    const r = calcularTotales([{ precio: 219500 }]);
    expect(r.descuento).toBe(0);
    expect(r.iva).toBe(26340);
    expect(r.total).toBe(245840);
  });

  test('redondea el IVA a 2 decimales (mitad hacia arriba) sin errores de coma flotante', () => {
    // 100.05 × 12 % = 12.006 → 12.01
    expect(calcularTotales([{ precio: 100.05 }]).iva).toBe(12.01);
    // 1.25 × 12 % = 0.15 exacto
    expect(calcularTotales([{ precio: 1.25 }]).iva).toBe(0.15);
    // 0.1 + 0.2 debe dar exactamente 0.3
    expect(calcularTotales([{ precio: 0.1 }, { precio: 0.2 }]).subtotal).toBe(0.3);
    // 10.04 × 12 % = 1.2048 → 1.20
    expect(calcularTotales([{ precio: 10.04 }]).iva).toBe(1.2);
  });

  test('admite otra tasa de IVA configurada (puntos básicos)', () => {
    expect(calcularTotales([{ precio: 1000 }], 500).iva).toBe(50);
  });

  test('rechaza descuento mayor que el precio', () => {
    expect(() => calcularTotales([{ precio: 1000, descuento: 1000.01 }])).toThrow(/no puede ser mayor/);
  });

  test('rechaza descuento negativo y precio no positivo', () => {
    expect(() => calcularTotales([{ precio: 1000, descuento: -1 }])).toThrow(/negativo/);
    expect(() => calcularTotales([{ precio: 0 }])).toThrow(/mayor que cero/);
  });

  test('rechaza cotización sin líneas', () => {
    expect(() => calcularTotales([])).toThrow(/al menos un vehículo/);
  });
});
