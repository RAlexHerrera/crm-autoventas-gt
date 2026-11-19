/** Rutas /api/interacciones */
const { Router } = require('express');
const c = require('./interacciones.controller');
const s = require('./interacciones.schemas');
const { validar } = require('../../middleware/validar');

const router = Router();
router.get('/', validar({ query: s.listar }), c.listar);
router.post('/', validar({ body: s.crear }), c.crear);

module.exports = router;
