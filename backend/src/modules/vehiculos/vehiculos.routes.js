/**
 * Rutas /api/vehiculos. Todos los roles consultan el catálogo; solo el
 * gerente y el administrador registran, editan o cambian disponibilidad.
 */
const { Router } = require('express');
const c = require('./vehiculos.controller');
const s = require('./vehiculos.schemas');
const { validar, paramsId } = require('../../middleware/validar');
const { autorizar, ROLES } = require('../../middleware/auth');

const router = Router();
const soloGestion = autorizar(ROLES.ADMIN, ROLES.GERENTE);

router.get('/', validar({ query: s.listar }), c.listar);
router.get('/catalogos', c.catalogos);
router.get('/inventario', c.inventario);
router.get('/:id', validar({ params: paramsId }), c.obtener);
router.post('/', soloGestion, validar({ body: s.guardar }), c.crear);
router.put('/:id', soloGestion, validar({ params: paramsId, body: s.guardar }), c.actualizar);
router.patch('/:id/estado', soloGestion, validar({ params: paramsId, body: s.estado }), c.cambiarEstado);
router.delete('/:id', soloGestion, validar({ params: paramsId }), c.eliminar);

module.exports = router;
