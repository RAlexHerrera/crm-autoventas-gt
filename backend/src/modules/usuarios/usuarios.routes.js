/** Rutas /api/usuarios */
const { Router } = require('express');
const c = require('./usuarios.controller');
const s = require('./usuarios.schemas');
const { validar, paramsId } = require('../../middleware/validar');
const { autorizar, ROLES } = require('../../middleware/auth');

const router = Router();

// Lista de vendedores activos (para selectores de asignación). Cualquier rol autenticado.
router.get('/vendedores', c.vendedores);

// El resto de la administración de usuarios es exclusiva del Administrador.
router.use(autorizar(ROLES.ADMIN));
router.get('/', validar({ query: s.listar }), c.listar);
router.get('/:id', validar({ params: paramsId }), c.obtener);
router.post('/', validar({ body: s.crear }), c.crear);
router.put('/:id', validar({ params: paramsId, body: s.actualizar }), c.actualizar);
router.patch('/:id/password', validar({ params: paramsId, body: s.restablecer }), c.restablecerPassword);
router.patch('/:id/activo', validar({ params: paramsId, body: s.activo }), c.cambiarActivo);

module.exports = router;
