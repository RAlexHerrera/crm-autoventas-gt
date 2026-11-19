/**
 * Rutas /api/reportes. Los reportes gerenciales son exclusivos del Gerente
 * Comercial y del Administrador. "mi-panel" muestra a cada vendedor solo sus datos.
 */
const { Router } = require('express');
const { z } = require('zod');
const c = require('./reportes.controller');
const v = require('../../utils/validaciones');
const { validar } = require('../../middleware/validar');
const { autorizar, ROLES } = require('../../middleware/auth');

const filtros = z.object({
  desde: v.fecha.optional(),
  hasta: v.fecha.optional(),
  vendedorId: z.coerce.number().int().positive().optional(),
  agrupacion: z.enum(['dia', 'mes']).optional(),
  limite: z.coerce.number().int().min(1).max(50).optional(),
});

const router = Router();

router.get('/mi-panel', validar({ query: filtros.omit({ vendedorId: true }) }), c.miPanel);

router.use(autorizar(ROLES.ADMIN, ROLES.GERENTE));
router.get('/dashboard', validar({ query: filtros }), c.dashboard);
router.get('/ventas-periodo', validar({ query: filtros }), c.ventasPorPeriodo);
router.get('/rendimiento-vendedores', validar({ query: filtros }), c.rendimientoVendedores);
router.get('/conversion-prospectos', validar({ query: filtros }), c.conversionProspectos);
router.get('/vehiculos-mas-vendidos', validar({ query: filtros }), c.vehiculosMasVendidos);
router.get('/funnel', validar({ query: filtros }), c.funnel);
router.get('/clasificacion-clientes', validar({ query: filtros }), c.clasificacionClientes);

module.exports = router;
