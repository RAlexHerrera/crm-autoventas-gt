/** Rutas /api/cotizaciones (todos los roles; el vendedor solo ve las suyas). */
const { Router } = require('express');
const c = require('./cotizaciones.controller');
const s = require('./cotizaciones.schemas');
const { validar, paramsId } = require('../../middleware/validar');

const router = Router();

router.get('/', validar({ query: s.listar }), c.listar);
router.get('/:id', validar({ params: paramsId }), c.obtener);
router.get('/:id/pdf', validar({ params: paramsId }), c.pdf);
router.post('/', validar({ body: s.guardar }), c.crear);
router.put('/:id', validar({ params: paramsId, body: s.guardar }), c.actualizar);
router.patch('/:id/estado', validar({ params: paramsId, body: s.estado }), c.cambiarEstado);
router.delete('/:id', validar({ params: paramsId }), c.eliminar);

module.exports = router;
