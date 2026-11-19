import { formatearFechaGt, formatearQuetzales, PorcentajePipe } from './pipes';
import { calcularTotales } from '../features/cotizaciones/calculos';

describe('Formatos de Guatemala', () => {
  it('moneda en quetzales con separador de miles y 2 decimales', () => {
    expect(formatearQuetzales(1234567.5)).toBe('Q1,234,567.50');
    expect(formatearQuetzales(null)).toBe('—');
  });

  it('fechas dd/mm/aaaa sin desfase de zona horaria', () => {
    expect(formatearFechaGt('2026-01-05')).toBe('05/01/2026');
    expect(formatearFechaGt('2026-11-19 23:45:10', true)).toBe('19/11/2026 23:45');
    expect(formatearFechaGt(null)).toBe('—');
  });

  it('porcentaje', () => {
    expect(new PorcentajePipe().transform(0.0833)).toBe('8.3 %');
  });
});

describe('Vista previa de totales de cotización', () => {
  it('aplica descuento, IVA 12 % y total igual que el backend', () => {
    expect(calcularTotales([{ precio: 289900, descuento: 4900 }])).toEqual({
      subtotal: 289900,
      descuento: 4900,
      baseImponible: 285000,
      iva: 34200,
      total: 319200,
    });
  });

  it('redondea el IVA a centavos', () => {
    expect(calcularTotales([{ precio: 129900, descuento: 2400.5 }]).iva).toBe(15299.94);
  });
});
