/** Rutas /api/prospectos */
const { Router } = require('express');
const c = require('./prospectos.controller');
const s = require('./prospectos.schemas');
const { validar, paramsId } = require('../../middleware/validar');
const { autorizar, ROLES } = require('../../middleware/auth');

const router = Router();

router.get('/', validar({ query: s.listar }), c.listar);
router.get('/verificar-duplicados', validar({ query: s.duplicados }), c.duplicados);
router.get('/:id', validar({ params: paramsId }), c.obtener);
router.post('/', validar({ body: s.guardar }), c.crear);
router.put('/:id', validar({ params: paramsId, body: s.guardar }), c.actualizar);
router.patch(
  '/:id/asignar',
  autorizar(ROLES.ADMIN, ROLES.GERENTE),
  validar({ params: paramsId, body: s.asignar }),
  c.asignar,
);
router.post('/:id/convertir', validar({ params: paramsId, body: s.convertir }), c.convertir);
router.delete('/:id', autorizar(ROLES.ADMIN, ROLES.GERENTE), validar({ params: paramsId }), c.eliminar);

module.exports = router;
