/**
 * Pool de conexiones MySQL y utilidades de transacción.
 * Todas las consultas del sistema usan parámetros (?) — nunca concatenación.
 */
const mysql = require('mysql2/promise');
const config = require('../config/env');

const pool = mysql.createPool({
  host: config.db.host,
  port: config.db.port,
  user: config.db.user,
  password: config.db.password,
  database: config.db.database,
  connectionLimit: config.db.connectionLimit,
  waitForConnections: true,
  // Los DECIMAL se devuelven como número (precisión suficiente para DECIMAL(12,2)).
  decimalNumbers: true,
  // Fechas como texto (hora de Guatemala) para evitar desfases de zona horaria.
  dateStrings: true,
  charset: 'utf8mb4',
});

// Cada conexión nueva trabaja en hora de Guatemala (UTC-6, sin horario de verano).
pool.pool.on('connection', (conexion) => {
  conexion.query("SET time_zone = '-06:00'");
});

/**
 * Ejecuta `fn` dentro de una transacción. Si `fn` lanza un error se hace
 * ROLLBACK total; si termina bien se hace COMMIT.
 * @template T
 * @param {(conn: import('mysql2/promise').PoolConnection) => Promise<T>} fn
 * @returns {Promise<T>}
 */
async function enTransaccion(fn) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const resultado = await fn(conn);
    await conn.commit();
    return resultado;
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}

module.exports = { pool, enTransaccion };
