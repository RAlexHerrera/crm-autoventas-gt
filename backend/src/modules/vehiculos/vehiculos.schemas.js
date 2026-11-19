/** Esquemas de validación de vehículos. */
const { z } = require('zod');
const { esquemaPaginacion } = require('../../utils/paginacion');
const v = require('../../utils/validaciones');
const { normalizarVin, VIN_REGEX } = require('../../utils/vin');

const TIPOS = ['Sedán', 'Hatchback', 'SUV', 'Pickup', 'Camioneta', 'Microbús', 'Deportivo'];
const CONDICIONES = ['Nuevo', 'Usado'];
const TRANSMISIONES = ['Automática', 'Manual'];
const COMBUSTIBLES = ['Gasolina', 'Diésel', 'Híbrido', 'Eléctrico'];
const ESTADOS = ['Disponible', 'Reservado', 'Vendido'];

const numeroOpcional = z.preprocess((x) => (x === '' ? undefined : x), z.coerce.number().min(0).optional());

const listar = z.object({
  ...esquemaPaginacion,
  marca: z.string().trim().max(40).optional(),
  tipo: z.enum(TIPOS).optional(),
  condicion: z.enum(CONDICIONES).optional(),
  estado: z.enum(ESTADOS).optional(),
  combustible: z.enum(COMBUSTIBLES).optional(),
  transmision: z.enum(TRANSMISIONES).optional(),
  precioMin: numeroOpcional,
  precioMax: numeroOpcional,
  anioMin: numeroOpcional,
  anioMax: numeroOpcional,
  orden: z.enum(['recientes', 'precio_asc', 'precio_desc', 'anio_desc', 'marca']).default('recientes'),
});

const vin = z.preprocess(
  normalizarVin,
  z
    .string()
    .length(17, 'El VIN debe tener exactamente 17 caracteres.')
    .regex(VIN_REGEX, 'El VIN solo admite letras y números, sin las letras I, O ni Q.'),
);

const guardar = z.object({
  vin,
  marca: v.texto(2, 40, 'Ingrese la marca.'),
  modelo: v.texto(1, 60, 'Ingrese el modelo.'),
  anio: z.coerce
    .number({ error: 'Ingrese el año del modelo.' })
    .int('El año debe ser un número entero.')
    .min(1980, 'El año debe ser 1980 o posterior.'),
  version: v.textoOpcional(60),
  tipo: z.enum(TIPOS, { error: 'Seleccione el tipo de vehículo.' }),
  condicion: z.enum(CONDICIONES, { error: 'Indique si el vehículo es nuevo o usado.' }),
  color: v.texto(3, 30, 'Ingrese el color.'),
  transmision: z.enum(TRANSMISIONES, { error: 'Seleccione la transmisión.' }),
  combustible: z.enum(COMBUSTIBLES, { error: 'Seleccione el combustible.' }),
  motor: v.textoOpcional(40),
  kilometraje: z.coerce
    .number({ error: 'Ingrese el kilometraje.' })
    .int('El kilometraje debe ser un número entero.')
    .min(0, 'El kilometraje no puede ser negativo.')
    .max(2000000, 'El kilometraje es demasiado alto.')
    .default(0),
  precio: v.monto('Ingrese el precio.').refine((p) => p > 0, 'El precio debe ser mayor que cero.'),
  descripcion: v.textoOpcional(500),
});

const estado = z.object({
  estado: z.enum(ESTADOS, { error: 'Seleccione un estado válido (Disponible o Reservado).' }),
});

module.exports = { listar, guardar, estado, TIPOS, CONDICIONES, TRANSMISIONES, COMBUSTIBLES, ESTADOS };
