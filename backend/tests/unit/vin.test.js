/** Pruebas unitarias de validación de VIN (HU-07). */
const { normalizarVin, formatoVinValido, digitoVerificadorValido } = require('../../src/utils/vin');

describe('VIN', () => {
  test('normaliza a mayúsculas y quita espacios/guiones', () => {
    expect(normalizarVin(' 1hgcm-82633a 004352 ')).toBe('1HGCM82633A004352');
  });

  test('acepta 17 caracteres alfanuméricos sin I, O, Q', () => {
    expect(formatoVinValido('1HGCM82633A004352')).toBe(true);
  });

  test.each([
    ['muy corto', '1HGCM82633A00435'],
    ['muy largo', '1HGCM82633A0043521'],
    ['contiene I', '1HGCM82633AI04352'],
    ['contiene O', '1HGCM82633AO04352'],
    ['contiene Q', '1HGCM82633AQ04352'],
    ['símbolos', '1HGCM82633A00435!'],
  ])('rechaza VIN %s', (_caso, vin) => {
    expect(formatoVinValido(vin)).toBe(false);
  });

  test('verifica el dígito verificador (posición 9)', () => {
    expect(digitoVerificadorValido('1HGCM82633A004352')).toBe(true);
    expect(digitoVerificadorValido('1HGCM82643A004352')).toBe(false);
  });
});
