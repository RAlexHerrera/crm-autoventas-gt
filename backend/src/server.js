/**
 * Punto de entrada: levanta el servidor HTTP de la API.
 */
const config = require('./config/env');
const { crearApp } = require('./app');
const { pool } = require('./db/pool');

const app = crearApp();
const servidor = app.listen(config.puerto, () => {
  console.log(`API CRM AutoVentas GT escuchando en el puerto ${config.puerto} (${config.entorno})`);
  console.log(`Documentación: http://localhost:${config.puerto}/api/docs`);
});

// Cierre ordenado (docker compose stop envía SIGTERM).
function cerrar(senal) {
  console.log(`Recibida ${senal}. Cerrando servidor...`);
  servidor.close(async () => {
    await pool.end();
    process.exit(0);
  });
}
process.on('SIGTERM', () => cerrar('SIGTERM'));
process.on('SIGINT', () => cerrar('SIGINT'));
