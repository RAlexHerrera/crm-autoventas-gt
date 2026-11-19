/**
 * Rutas /api/roles (Administrador). Los tres roles son fijos porque los
 * permisos están definidos en el código (RBAC); el administrador puede
 * consultar los roles, renombrarlos y editar su descripción.
 */
const { Router } = require('express');
const { z } = require('zod');
const repo = require('./roles.repository');
const { validar, paramsId } = require('../../middleware/validar');
const { autorizar, ROLES } = require('../../middleware/auth');
const { noEncontrado } = require('../../utils/errores');

const router = Router();
router.use(autorizar(ROLES.ADMIN));

const esquemaActualizar = z.object({
  nombre: z.string().trim().min(3, 'El nombre debe tener al menos 3 caracteres.').max(50),
  descripcion: z.string().trim().max(255).optional().nullable(),
});

router.get('/', async (_req, res) => {
  res.json(await repo.listar());
});

router.put('/:id', validar({ params: paramsId, body: esquemaActualizar }), async (req, res) => {
  const { id } = req.valido.params;
  if (!(await repo.obtener(id))) throw noEncontrado('El rol no existe.');
  await repo.actualizar(id, req.valido.body);
  res.json(await repo.obtener(id));
});

module.exports = router;
