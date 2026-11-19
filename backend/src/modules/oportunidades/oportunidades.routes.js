/** Rutas /api/oportunidades */
const { Router } = require('express');
const c = require('./oportunidades.controller');
const s = require('./oportunidades.schemas');
const { validar, paramsId } = require('../../middleware/validar');
const { autorizar, ROLES } = require('../../middleware/auth');

const router = Router();

router.get('/', validar({ query: s.listar }), c.listar);
router.get('/resumen-etapas', validar({ query: s.resumen }), c.resumen);
router.get('/:id', validar({ params: paramsId }), c.obtener);
router.post('/', validar({ body: s.crear }), c.crear);
router.put('/:id', validar({ params: paramsId, body: s.actualizar }), c.actualizar);
router.patch('/:id/etapa', validar({ params: paramsId, body: s.etapa }), c.cambiarEtapa);
router.patch(
  '/:id/asignar',
  autorizar(ROLES.ADMIN, ROLES.GERENTE),
  validar({ params: paramsId, body: s.asignar }),
  c.asignar,
);

module.exports = router;
