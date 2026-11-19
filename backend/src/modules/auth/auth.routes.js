/** Rutas /api/auth */
const { Router } = require('express');
const { rateLimit } = require('express-rate-limit');
const controlador = require('./auth.controller');
const esquemas = require('./auth.schemas');
const { validar } = require('../../middleware/validar');
const { autenticar } = require('../../middleware/auth');

/**
 * @param {{ maxIntentos: number, ventanaMinutos: number }} opcionesLogin
 */
function crearRutasAuth(opcionesLogin) {
  const router = Router();

  // Límite de intentos fallidos de inicio de sesión por IP.
  const limitadorLogin = rateLimit({
    windowMs: opcionesLogin.ventanaMinutos * 60 * 1000,
    limit: opcionesLogin.maxIntentos,
    skipSuccessfulRequests: true,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: {
      mensaje: `Demasiados intentos fallidos. Espere ${opcionesLogin.ventanaMinutos} minutos e intente de nuevo.`,
    },
  });

  router.post('/login', limitadorLogin, validar({ body: esquemas.login }), controlador.login);
  router.get('/perfil', autenticar, controlador.perfil);
  router.post(
    '/cambiar-password',
    autenticar,
    validar({ body: esquemas.cambiarPassword }),
    controlador.cambiarPassword,
  );
  return router;
}

module.exports = { crearRutasAuth };
