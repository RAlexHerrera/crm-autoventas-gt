/**
 * Generación de correlativos únicos (COT-2026-000001, VTA-2026-000001).
 * Debe llamarse dentro de una transacción: la fila (serie, año) se bloquea con
 * SELECT ... FOR UPDATE, de modo que dos solicitudes simultáneas nunca obtienen
 * el mismo número (la segunda espera a que la primera confirme o revierta).
 * La restricción UNIQUE de la tabla es una segunda barrera.
 */

async function bloquearFila(conn, serie, anio) {
  const [filas] = await conn.query(
    'SELECT ultimo FROM correlativos WHERE serie = ? AND anio = ? FOR UPDATE',
    [serie, anio],
  );
  return filas[0];
}

/**
 * @param {import('mysql2/promise').PoolConnection} conn conexión con transacción abierta
 * @param {'COT'|'VTA'} serie
 */
async function siguienteCorrelativo(conn, serie) {
  const [[{ anio }]] = await conn.query('SELECT YEAR(CURDATE()) AS anio');
  // Se bloquea primero la fila existente (caso normal). Solo el primer documento
  // del año crea la fila; así se evita tomar un bloqueo compartido previo.
  let fila = await bloquearFila(conn, serie, anio);
  if (!fila) {
    await conn.query('INSERT IGNORE INTO correlativos (serie, anio, ultimo) VALUES (?, ?, 0)', [serie, anio]);
    fila = await bloquearFila(conn, serie, anio);
  }
  const siguiente = fila.ultimo + 1;
  await conn.query('UPDATE correlativos SET ultimo = ? WHERE serie = ? AND anio = ?', [
    siguiente,
    serie,
    anio,
  ]);
  return `${serie}-${anio}-${String(siguiente).padStart(6, '0')}`;
}

module.exports = { siguienteCorrelativo };
