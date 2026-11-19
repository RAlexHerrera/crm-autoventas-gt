/** Rutas /api/ventas (todos los roles; el vendedor solo ve y registra las suyas). */
const { Router } = require('express');
const c = require('./ventas.controller');
const s = require('./ventas.schemas');
const { validar, paramsId } = require('../../middleware/validar');

const router = Router();

router.get('/', validar({ query: s.listar }), c.listar);
router.get('/:id', validar({ params: paramsId }), c.obtener);
router.post('/', validar({ body: s.registrar }), c.registrar);

module.exports = router;
