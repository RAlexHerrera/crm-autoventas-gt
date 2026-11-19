/** Esquemas de validación de prospectos. */
const { z } = require('zod');
const { esquemaPaginacion } = require('../../utils/paginacion');
const v = require('../../utils/validaciones');
const { dpi, nit } = require('../clientes/clientes.schemas');

const ESTADOS = ['Nuevo', 'Contactado', 'Calificado', 'Convertido', 'Descartado'];
const FUENTES = ['Sitio web', 'Referido', 'Redes sociales', 'Visita en agencia', 'Llamada', 'Feria'];

const listar = z.object({
  ...esquemaPaginacion,
  estado: z.enum(ESTADOS).optional(),
  fuente: z.enum(FUENTES).optional(),
  vendedorId: z.coerce.number().int().positive().optional(),
});

const guardar = z.object({
  nombres: v.texto(2, 80, 'Ingrese los nombres (mínimo 2 caracteres).'),
  apellidos: v.texto(2, 80, 'Ingrese los apellidos (mínimo 2 caracteres).'),
  telefono: v.telefono,
  email: v.correoOpcional,
  fuente: z.enum(FUENTES, { error: 'Seleccione la fuente del prospecto.' }),
  interes: v.textoOpcional(255),
  estado: z.enum(ESTADOS, { error: 'Seleccione un estado válido.' }).default('Nuevo'),
  vendedorId: v.idOpcional,
});

const duplicados = z.object({
  email: v.correoOpcional,
  telefono: z.string().trim().max(25).optional(),
  excluirProspectoId: v.idOpcional,
});

const asignar = z.object({
  vendedorId: z.coerce.number({ error: 'Seleccione un vendedor.' }).int().positive(),
});

const convertir = z.object({ dpi, nit, direccion: v.textoOpcional(255) });

module.exports = { listar, guardar, duplicados, asignar, convertir, ESTADOS, FUENTES };
