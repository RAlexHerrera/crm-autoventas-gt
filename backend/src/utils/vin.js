/**
 * Validación de VIN (Vehicle Identification Number, ISO 3779).
 * Formato: 17 caracteres alfanuméricos en mayúscula, sin las letras I, O ni Q.
 * El dígito verificador (posición 9) es obligatorio solo en Norteamérica;
 * en Guatemala circulan vehículos de otros mercados, por eso únicamente se
 * informa si es correcto pero no se exige (ver docs/DECISIONES.md).
 */

const VIN_REGEX = /^[A-HJ-NPR-Z0-9]{17}$/;

const TRANSLITERACION = {
  A: 1,
  B: 2,
  C: 3,
  D: 4,
  E: 5,
  F: 6,
  G: 7,
  H: 8,
  J: 1,
  K: 2,
  L: 3,
  M: 4,
  N: 5,
  P: 7,
  R: 9,
  S: 2,
  T: 3,
  U: 4,
  V: 5,
  W: 6,
  X: 7,
  Y: 8,
  Z: 9,
};
const PESOS = [8, 7, 6, 5, 4, 3, 2, 10, 0, 9, 8, 7, 6, 5, 4, 3, 2];

/** Quita espacios y guiones y pasa a mayúsculas. */
function normalizarVin(vin) {
  return String(vin || '')
    .replace(/[\s-]/g, '')
    .toUpperCase();
}

/** ¿Cumple el formato de 17 caracteres sin I, O, Q? */
function formatoVinValido(vin) {
  return VIN_REGEX.test(vin);
}

/** Calcula el dígito verificador esperado ('0'-'9' o 'X'). */
function digitoVerificador(vin) {
  const suma = vin.split('').reduce((acc, c, i) => {
    const valor = /[0-9]/.test(c) ? Number(c) : TRANSLITERACION[c];
    return acc + valor * PESOS[i];
  }, 0);
  const resto = suma % 11;
  return resto === 10 ? 'X' : String(resto);
}

/** ¿El dígito verificador del VIN es correcto? (solo si el formato es válido) */
function digitoVerificadorValido(vin) {
  return formatoVinValido(vin) && vin[8] === digitoVerificador(vin);
}

module.exports = { normalizarVin, formatoVinValido, digitoVerificador, digitoVerificadorValido, VIN_REGEX };
