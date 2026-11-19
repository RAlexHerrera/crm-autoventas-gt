/**
 * Utilidades de texto.
 */

/** Deja solo los dígitos de un teléfono (para detectar duplicados). */
function normalizarTelefono(telefono) {
  return String(telefono || '').replace(/\D/g, '');
}

/** Correo en minúsculas y sin espacios; vacío → null. */
function normalizarEmail(email) {
  const e = String(email || '')
    .trim()
    .toLowerCase();
  return e === '' ? null : e;
}

module.exports = { normalizarTelefono, normalizarEmail };
