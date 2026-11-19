/**
 * Construcción de la aplicación Express (sin levantar el servidor), para poder
 * usarla tanto en server.js como en las pruebas con Supertest.
 */
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const { z } = require('zod');
const swaggerUi = require('swagger-ui-express');

const config = require('./config/env');
const { pool } = require('./db/pool');
const { autenticar } = require('./middleware/auth');
const { manejadorErrores, rutaNoEncontrada } = require('./middleware/errores');
const { crearRutasAuth } = require('./modules/auth/auth.routes');
const openapi = require('./docs/openapi');

// Mensajes de validación de Zod en español.
z.config(z.locales.es());

/**
 * @param {{ login?: { maxIntentos: number, ventanaMinutos: number } }} [opciones]
 */
function crearApp(opciones = {}) {
  const app = express();

  // Detrás de Nginx: confiar en el primer proxy para obtener la IP real (límite de intentos).
  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  app.use(helmet());
  app.use(
    cors({
      origin: config.corsOrigen,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    }),
  );
  app.use(express.json({ limit: '100kb' }));

  // Salud del servicio (usado por el healthcheck de Docker).
  app.get('/api/salud', async (_req, res) => {
    await pool.query('SELECT 1');
    res.json({ estado: 'ok', baseDeDatos: 'ok', hora: new Date().toISOString() });
  });

  // Documentación OpenAPI / Swagger. Se relaja la CSP solo en esta ruta.
  app.use(
    '/api/docs',
    helmet({ contentSecurityPolicy: false }),
    swaggerUi.serve,
    swaggerUi.setup(openapi, { customSiteTitle: 'API CRM AutoVentas GT' }),
  );
  app.get('/api/openapi.json', (_req, res) => res.json(openapi));

  // Rutas públicas
  app.use('/api/auth', crearRutasAuth(opciones.login || config.login));

  // Rutas protegidas: todas requieren token válido.
  const protegidas = express.Router();
  protegidas.use(autenticar);
  protegidas.use('/usuarios', require('./modules/usuarios/usuarios.routes'));
  protegidas.use('/roles', require('./modules/roles/roles.routes'));
  protegidas.use('/clientes', require('./modules/clientes/clientes.routes'));
  protegidas.use('/interacciones', require('./modules/interacciones/interacciones.routes'));
  protegidas.use('/prospectos', require('./modules/prospectos/prospectos.routes'));
  protegidas.use('/oportunidades', require('./modules/oportunidades/oportunidades.routes'));
  protegidas.use('/vehiculos', require('./modules/vehiculos/vehiculos.routes'));
  protegidas.use('/cotizaciones', require('./modules/cotizaciones/cotizaciones.routes'));
  protegidas.use('/ventas', require('./modules/ventas/ventas.routes'));
  protegidas.use('/reportes', require('./modules/reportes/reportes.routes'));
  app.use('/api', protegidas);

  app.use(rutaNoEncontrada);
  app.use(manejadorErrores);
  return app;
}

module.exports = { crearApp };
