/**
 * Prepara una base de datos de pruebas limpia ejecutando los mismos scripts
 * de db/init que usa Docker (esquema + datos de ejemplo).
 */
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

const DIRECTORIO_SCRIPTS = process.env.SCHEMA_DIR || path.resolve(__dirname, '../../../db/init');

async function prepararBd() {
  const nombre = process.env.DB_NAME;
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    multipleStatements: true,
    charset: 'utf8mb4',
  });
  try {
    await conn.query(`DROP DATABASE IF EXISTS \`${nombre}\``);
    await conn.query(`CREATE DATABASE \`${nombre}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci`);
    await conn.query(`USE \`${nombre}\``);
    const scripts = fs
      .readdirSync(DIRECTORIO_SCRIPTS)
      .filter((f) => f.endsWith('.sql'))
      .sort();
    for (const script of scripts) {
      await conn.query(fs.readFileSync(path.join(DIRECTORIO_SCRIPTS, script), 'utf8'));
    }
  } finally {
    await conn.end();
  }
}

module.exports = { prepararBd };
