/** Rutas /api/clientes (todos los roles; el vendedor solo ve y modifica lo suyo). */
const { Router } = require('express');
const c = require('./clientes.controller');
const s = require('./clientes.schemas');
const { validar, paramsId } = require('../../middleware/validar');
const { autorizar, ROLES } = require('../../middleware/auth');

const router = Router();

router.get('/', validar({ query: s.listar }), c.listar);
router.get('/:id', validar({ params: paramsId }), c.obtener);
router.post('/', validar({ body: s.guardar }), c.crear);
router.put('/:id', validar({ params: paramsId, body: s.guardar }), c.actualizar);
router.delete('/:id', autorizar(ROLES.ADMIN, ROLES.GERENTE), validar({ params: paramsId }), c.eliminar);

module.exports = router;
