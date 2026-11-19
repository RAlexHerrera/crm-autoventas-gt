/**
 * Especificación OpenAPI 3.0 de la API del CRM AutoVentas GT.
 * Se publica en /api/docs (Swagger UI) y /api/openapi.json.
 */

const ref = (nombre) => ({ $ref: `#/components/schemas/${nombre}` });
const json = (schema) => ({ 'application/json': { schema } });
const resp = (descripcion, schema) =>
  schema ? { description: descripcion, content: json(schema) } : { description: descripcion };
const errores = (...codigos) =>
  Object.fromEntries(
    codigos.map((c) => [
      c,
      {
        400: resp('Datos inválidos', ref('ErrorValidacion')),
        401: resp('No autenticado o sesión expirada', ref('Error')),
        403: resp('Sin permisos para esta acción', ref('Error')),
        404: resp('No existe o no pertenece al usuario', ref('Error')),
        409: resp('Conflicto con una regla de negocio', ref('Error')),
        429: resp('Demasiados intentos', ref('Error')),
      }[c],
    ]),
  );
const idParam = { name: 'id', in: 'path', required: true, schema: { type: 'integer', minimum: 1 } };
const qp = (name, schema, description) => ({ name, in: 'query', required: false, schema, description });
const paginacion = [
  qp('pagina', { type: 'integer', default: 1 }),
  qp('tamano', { type: 'integer', default: 10, maximum: 100 }),
  qp('q', { type: 'string' }, 'Texto de búsqueda'),
];
const rango = [
  qp('desde', { type: 'string', format: 'date' }),
  qp('hasta', { type: 'string', format: 'date' }),
];
const body = (schema) => ({ required: true, content: json(schema) });
const paginado = (item) => ({
  type: 'object',
  properties: {
    datos: { type: 'array', items: ref(item) },
    total: { type: 'integer' },
    pagina: { type: 'integer' },
    tamano: { type: 'integer' },
    paginas: { type: 'integer' },
  },
});

/** Genera las operaciones CRUD típicas de un recurso. */
function crud(
  tag,
  recurso,
  esquema,
  entrada,
  { listarParams = [], borrar = true, roles = 'Todos los roles' } = {},
) {
  const coleccion = {
    get: {
      tags: [tag],
      summary: `Listar ${recurso} (paginado, con filtros)`,
      parameters: [...paginacion, ...listarParams],
      responses: { 200: resp('Listado', paginado(esquema)), ...errores(400, 401) },
    },
    post: {
      tags: [tag],
      summary: `Registrar ${recurso}`,
      description: roles,
      requestBody: body(ref(entrada)),
      responses: { 201: resp('Creado', ref(esquema)), ...errores(400, 401, 403, 409) },
    },
  };
  const item = {
    get: {
      tags: [tag],
      summary: `Obtener ${recurso} por id`,
      parameters: [idParam],
      responses: { 200: resp('Detalle', ref(esquema)), ...errores(401, 404) },
    },
    put: {
      tags: [tag],
      summary: `Actualizar ${recurso}`,
      parameters: [idParam],
      requestBody: body(ref(entrada)),
      responses: { 200: resp('Actualizado', ref(esquema)), ...errores(400, 401, 403, 404, 409) },
    },
  };
  if (borrar) {
    item.delete = {
      tags: [tag],
      summary: `Eliminar ${recurso}`,
      description: 'Solo si no tiene registros relacionados.',
      parameters: [idParam],
      responses: { 204: resp('Eliminado'), ...errores(401, 403, 404, 409) },
    };
  }
  return { coleccion, item };
}

const str = { type: 'string' };
const int = { type: 'integer' };
const num = { type: 'number' };
const nullable = (s) => ({ ...s, nullable: true });
const enumStr = (valores) => ({ type: 'string', enum: valores });

const clientes = crud('Clientes', 'clientes', 'Cliente', 'ClienteEntrada', {
  listarParams: [
    qp('clasificacion', enumStr(['Nuevo', 'Regular', 'Frecuente', 'VIP', 'Inactivo'])),
    qp('vendedorId', int),
  ],
});
const prospectos = crud('Prospectos', 'prospectos', 'Prospecto', 'ProspectoEntrada', {
  listarParams: [qp('estado', str), qp('fuente', str), qp('vendedorId', int)],
});
const vehiculos = crud('Vehículos', 'vehículos', 'Vehiculo', 'VehiculoEntrada', {
  roles: 'Solo Gerente Comercial y Administrador.',
  listarParams: [
    qp('marca', str),
    qp('tipo', str),
    qp('condicion', enumStr(['Nuevo', 'Usado'])),
    qp('estado', enumStr(['Disponible', 'Reservado', 'Vendido'])),
    qp('combustible', str),
    qp('transmision', str),
    qp('precioMin', num),
    qp('precioMax', num),
    qp('anioMin', int),
    qp('anioMax', int),
    qp('orden', enumStr(['recientes', 'precio_asc', 'precio_desc', 'anio_desc', 'marca'])),
  ],
});
const oportunidades = crud('Oportunidades', 'oportunidades', 'Oportunidad', 'OportunidadEntrada', {
  borrar: false,
  listarParams: [
    qp('etapa', str),
    qp('abiertas', { type: 'boolean' }),
    qp('vendedorId', int),
    qp('clienteId', int),
    qp('prospectoId', int),
  ],
});
const cotizaciones = crud('Cotizaciones', 'cotizaciones', 'Cotizacion', 'CotizacionEntrada', {
  listarParams: [qp('estado', str), qp('vendedorId', int), ...rango],
});
const usuarios = crud('Usuarios', 'usuarios', 'Usuario', 'UsuarioEntrada', {
  borrar: false,
  roles: 'Solo Administrador.',
  listarParams: [qp('rol', enumStr(['ADMIN', 'GERENTE', 'VENDEDOR'])), qp('activo', { type: 'boolean' })],
});

const reporte = (summary, extra = []) => ({
  get: {
    tags: ['Reportes'],
    summary,
    description: 'Solo Gerente Comercial y Administrador.',
    parameters: [...rango, qp('vendedorId', int), ...extra],
    responses: { 200: resp('Datos del reporte', { type: 'object' }), ...errores(400, 401, 403) },
  },
});

module.exports = {
  openapi: '3.0.3',
  info: {
    title: 'API CRM AutoVentas GT, S.A.',
    version: '1.0.0',
    description:
      'API REST del CRM. Inicie sesión en **POST /api/auth/login**, copie el `token` y péguelo en **Authorize**. ' +
      'Los permisos se validan en el servidor: el Vendedor solo ve sus registros; el Gerente Comercial ve toda la ' +
      'gestión comercial y los reportes; el Administrador gestiona usuarios y roles. Montos en quetzales (GTQ). IVA 12 %.',
  },
  servers: [{ url: '/' }],
  tags: [
    { name: 'Autenticación' },
    { name: 'Usuarios' },
    { name: 'Roles' },
    { name: 'Clientes' },
    { name: 'Interacciones' },
    { name: 'Prospectos' },
    { name: 'Oportunidades' },
    { name: 'Vehículos' },
    { name: 'Cotizaciones' },
    { name: 'Ventas' },
    { name: 'Reportes' },
    { name: 'Sistema' },
  ],
  security: [{ bearerAuth: [] }],
  paths: {
    '/api/salud': {
      get: {
        tags: ['Sistema'],
        security: [],
        summary: 'Estado del servicio y de la base de datos',
        responses: { 200: resp('OK') },
      },
    },
    '/api/auth/login': {
      post: {
        tags: ['Autenticación'],
        security: [],
        summary: 'Iniciar sesión (máx. 5 intentos fallidos cada 15 min por IP)',
        requestBody: body({
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: { ...str, example: 'gerente@autoventas.gt' },
            password: { ...str, example: 'Gerente123!' },
          },
        }),
        responses: {
          200: resp('Sesión iniciada', {
            type: 'object',
            properties: { token: str, expiraEn: str, usuario: ref('UsuarioSesion') },
          }),
          ...errores(400, 401, 429),
        },
      },
    },
    '/api/auth/perfil': {
      get: {
        tags: ['Autenticación'],
        summary: 'Usuario de la sesión actual',
        responses: { 200: resp('Perfil', ref('UsuarioSesion')), ...errores(401) },
      },
    },
    '/api/auth/cambiar-password': {
      post: {
        tags: ['Autenticación'],
        summary: 'Cambiar la contraseña propia',
        requestBody: body({ type: 'object', properties: { actual: str, nueva: str } }),
        responses: { 200: resp('Actualizada'), ...errores(400, 401) },
      },
    },
    '/api/usuarios': usuarios.coleccion,
    '/api/usuarios/vendedores': {
      get: {
        tags: ['Usuarios'],
        summary: 'Vendedores activos (para asignación). Todos los roles.',
        responses: { 200: resp('Lista') },
      },
    },
    '/api/usuarios/{id}': { get: usuarios.item.get, put: usuarios.item.put },
    '/api/usuarios/{id}/password': {
      patch: {
        tags: ['Usuarios'],
        summary: 'Restablecer contraseña (Administrador)',
        parameters: [idParam],
        requestBody: body({ type: 'object', properties: { password: str } }),
        responses: { 200: resp('Restablecida'), ...errores(400, 401, 403, 404) },
      },
    },
    '/api/usuarios/{id}/activo': {
      patch: {
        tags: ['Usuarios'],
        summary: 'Activar o desactivar un usuario (Administrador)',
        parameters: [idParam],
        requestBody: body({ type: 'object', properties: { activo: { type: 'boolean' } } }),
        responses: { 200: resp('Actualizado'), ...errores(400, 401, 403, 404, 409) },
      },
    },
    '/api/roles': {
      get: {
        tags: ['Roles'],
        summary: 'Listar roles (Administrador)',
        responses: { 200: resp('Roles'), ...errores(401, 403) },
      },
    },
    '/api/roles/{id}': {
      put: {
        tags: ['Roles'],
        summary: 'Editar nombre y descripción de un rol (Administrador)',
        parameters: [idParam],
        requestBody: body({ type: 'object', properties: { nombre: str, descripcion: str } }),
        responses: { 200: resp('Actualizado'), ...errores(400, 401, 403, 404, 409) },
      },
    },
    '/api/clientes': clientes.coleccion,
    '/api/clientes/{id}': clientes.item,
    '/api/interacciones': {
      get: {
        tags: ['Interacciones'],
        summary: 'Historial de interacciones de un cliente, prospecto u oportunidad',
        parameters: [qp('clienteId', int), qp('prospectoId', int), qp('oportunidadId', int)],
        responses: { 200: resp('Historial'), ...errores(400, 401, 404) },
      },
      post: {
        tags: ['Interacciones'],
        summary: 'Registrar una interacción',
        requestBody: body(ref('InteraccionEntrada')),
        responses: { 201: resp('Registrada'), ...errores(400, 401, 404) },
      },
    },
    '/api/prospectos': prospectos.coleccion,
    '/api/prospectos/verificar-duplicados': {
      get: {
        tags: ['Prospectos'],
        summary: 'Detectar prospectos o clientes con el mismo correo o teléfono',
        parameters: [qp('email', str), qp('telefono', str), qp('excluirProspectoId', int)],
        responses: { 200: resp('Posibles duplicados'), ...errores(400, 401) },
      },
    },
    '/api/prospectos/{id}': prospectos.item,
    '/api/prospectos/{id}/asignar': {
      patch: {
        tags: ['Prospectos'],
        summary: 'Asignar vendedor (Gerente/Administrador)',
        parameters: [idParam],
        requestBody: body({ type: 'object', properties: { vendedorId: int } }),
        responses: { 200: resp('Asignado'), ...errores(400, 401, 403, 404) },
      },
    },
    '/api/prospectos/{id}/convertir': {
      post: {
        tags: ['Prospectos'],
        summary: 'Convertir prospecto en cliente',
        parameters: [idParam],
        requestBody: body({ type: 'object', properties: { dpi: str, nit: str, direccion: str } }),
        responses: { 201: resp('Convertido'), ...errores(400, 401, 404, 409) },
      },
    },
    '/api/oportunidades': oportunidades.coleccion,
    '/api/oportunidades/resumen-etapas': {
      get: {
        tags: ['Oportunidades'],
        summary: 'Cantidad y monto por etapa del embudo',
        parameters: [qp('vendedorId', int)],
        responses: { 200: resp('Resumen') },
      },
    },
    '/api/oportunidades/{id}': oportunidades.item,
    '/api/oportunidades/{id}/etapa': {
      patch: {
        tags: ['Oportunidades'],
        summary: 'Cambiar etapa del embudo («Ganado» solo se asigna al vender; «Perdido» exige motivo)',
        parameters: [idParam],
        requestBody: body({
          type: 'object',
          properties: {
            etapa: enumStr(['Prospección', 'Contacto', 'Cotización', 'Negociación', 'Perdido']),
            motivoPerdida: str,
          },
        }),
        responses: { 200: resp('Actualizada'), ...errores(400, 401, 404, 409) },
      },
    },
    '/api/oportunidades/{id}/asignar': {
      patch: {
        tags: ['Oportunidades'],
        summary: 'Reasignar vendedor (Gerente/Administrador)',
        parameters: [idParam],
        requestBody: body({ type: 'object', properties: { vendedorId: int } }),
        responses: { 200: resp('Asignada'), ...errores(400, 401, 403, 404, 409) },
      },
    },
    '/api/vehiculos': vehiculos.coleccion,
    '/api/vehiculos/catalogos': {
      get: {
        tags: ['Vehículos'],
        summary: 'Valores para filtros (marcas, tipos...)',
        responses: { 200: resp('Catálogos') },
      },
    },
    '/api/vehiculos/inventario': {
      get: {
        tags: ['Vehículos'],
        summary: 'Resumen de inventario (HU-08)',
        responses: { 200: resp('Resumen') },
      },
    },
    '/api/vehiculos/{id}': vehiculos.item,
    '/api/vehiculos/{id}/estado': {
      patch: {
        tags: ['Vehículos'],
        summary: 'Cambiar disponibilidad (Disponible/Reservado). Gerente/Administrador.',
        parameters: [idParam],
        requestBody: body({ type: 'object', properties: { estado: enumStr(['Disponible', 'Reservado']) } }),
        responses: { 200: resp('Actualizado'), ...errores(400, 401, 403, 404, 409) },
      },
    },
    '/api/cotizaciones': cotizaciones.coleccion,
    '/api/cotizaciones/{id}': cotizaciones.item,
    '/api/cotizaciones/{id}/estado': {
      patch: {
        tags: ['Cotizaciones'],
        summary: 'Cambiar estado: Borrador→Enviada; Enviada→Aceptada|Rechazada; Aceptada→Rechazada',
        description: 'Al aceptar se reservan los vehículos; al rechazar una aceptada se liberan.',
        parameters: [idParam],
        requestBody: body({ type: 'object', properties: { estado: str, comentario: str } }),
        responses: { 200: resp('Actualizada', ref('Cotizacion')), ...errores(400, 401, 404, 409) },
      },
    },
    '/api/cotizaciones/{id}/pdf': {
      get: {
        tags: ['Cotizaciones'],
        summary: 'Descargar la cotización en PDF (HU-14)',
        parameters: [idParam],
        responses: {
          200: { description: 'Documento PDF', content: { 'application/pdf': {} } },
          ...errores(401, 404),
        },
      },
    },
    '/api/ventas': {
      get: {
        tags: ['Ventas'],
        summary: 'Listar ventas',
        parameters: [...paginacion, qp('vendedorId', int), ...rango],
        responses: { 200: resp('Listado', paginado('Venta')), ...errores(401) },
      },
      post: {
        tags: ['Ventas'],
        summary: 'Convertir una cotización ACEPTADA en venta (transacción atómica)',
        description:
          'Registra la venta, marca los vehículos como Vendido, la oportunidad como Ganado y vincula o convierte el ' +
          'prospecto en cliente. Ante cualquier error se revierte todo. 409 si la cotización ya fue vendida.',
        requestBody: body(ref('VentaEntrada')),
        responses: { 201: resp('Venta registrada', ref('Venta')), ...errores(400, 401, 404, 409) },
      },
    },
    '/api/ventas/{id}': {
      get: {
        tags: ['Ventas'],
        summary: 'Detalle de venta',
        parameters: [idParam],
        responses: { 200: resp('Venta', ref('Venta')), ...errores(401, 404) },
      },
    },
    '/api/reportes/dashboard': reporte(
      'Dashboard gerencial (KPI, ventas por mes, funnel, top vehículos, vendedores)',
    ),
    '/api/reportes/ventas-periodo': reporte('Ventas por período (HU-11)', [
      qp('agrupacion', enumStr(['dia', 'mes'])),
    ]),
    '/api/reportes/rendimiento-vendedores': reporte('Rendimiento por vendedor (HU-12)'),
    '/api/reportes/conversion-prospectos': reporte('Conversión de prospectos (HU-13)'),
    '/api/reportes/vehiculos-mas-vendidos': reporte('Vehículos más vendidos', [qp('limite', int)]),
    '/api/reportes/funnel': reporte('Funnel de ventas'),
    '/api/reportes/clasificacion-clientes': reporte('Clasificación de clientes (HU-15)'),
    '/api/reportes/mi-panel': {
      get: {
        tags: ['Reportes'],
        summary: 'Panel personal: mismos indicadores limitados a los datos del usuario (todos los roles)',
        parameters: rango,
        responses: { 200: resp('Panel'), ...errores(401) },
      },
    },
  },
  components: {
    securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } },
    schemas: {
      Error: { type: 'object', properties: { mensaje: str } },
      ErrorValidacion: {
        type: 'object',
        properties: {
          mensaje: str,
          errores: { type: 'array', items: { type: 'object', properties: { campo: str, mensaje: str } } },
        },
      },
      UsuarioSesion: {
        type: 'object',
        properties: {
          id: int,
          nombre: str,
          email: str,
          rol: enumStr(['ADMIN', 'GERENTE', 'VENDEDOR']),
          rolNombre: str,
        },
      },
      Usuario: {
        type: 'object',
        properties: {
          id: int,
          nombre: str,
          email: str,
          activo: { type: 'boolean' },
          rolId: int,
          rol: str,
          rolNombre: str,
          ultimoAcceso: nullable(str),
        },
      },
      UsuarioEntrada: {
        type: 'object',
        required: ['nombre', 'email', 'rolId'],
        properties: {
          nombre: str,
          email: str,
          rolId: int,
          password: { ...str, description: 'Solo al crear. Mín. 8, letras y números.' },
          activo: { type: 'boolean' },
        },
      },
      Cliente: {
        type: 'object',
        properties: {
          id: int,
          nombres: str,
          apellidos: str,
          dpi: nullable(str),
          nit: str,
          telefono: str,
          email: nullable(str),
          direccion: nullable(str),
          clasificacion: str,
          vendedorId: int,
          vendedorNombre: str,
          compras: int,
        },
      },
      ClienteEntrada: {
        type: 'object',
        required: ['nombres', 'apellidos', 'telefono'],
        properties: {
          nombres: str,
          apellidos: str,
          dpi: { ...str, example: '2456789010101' },
          nit: { ...str, example: '1234567-8' },
          telefono: { ...str, example: '5512-3456' },
          email: str,
          direccion: str,
          clasificacion: enumStr(['Nuevo', 'Regular', 'Frecuente', 'VIP', 'Inactivo']),
          vendedorId: int,
        },
      },
      InteraccionEntrada: {
        type: 'object',
        required: ['tipo', 'descripcion'],
        properties: {
          clienteId: int,
          prospectoId: int,
          oportunidadId: int,
          tipo: enumStr(['Llamada', 'Correo', 'WhatsApp', 'Visita', 'Reunión', 'Prueba de manejo', 'Nota']),
          descripcion: str,
          fecha: { ...str, example: '2026-11-19 10:30' },
        },
      },
      Prospecto: {
        type: 'object',
        properties: {
          id: int,
          nombres: str,
          apellidos: str,
          telefono: str,
          email: nullable(str),
          fuente: str,
          interes: nullable(str),
          estado: str,
          vendedorId: int,
          clienteId: nullable(int),
        },
      },
      ProspectoEntrada: {
        type: 'object',
        required: ['nombres', 'apellidos', 'telefono', 'fuente'],
        properties: {
          nombres: str,
          apellidos: str,
          telefono: str,
          email: str,
          fuente: enumStr([
            'Sitio web',
            'Referido',
            'Redes sociales',
            'Visita en agencia',
            'Llamada',
            'Feria',
          ]),
          interes: str,
          estado: enumStr(['Nuevo', 'Contactado', 'Calificado', 'Descartado']),
          vendedorId: int,
        },
      },
      Oportunidad: {
        type: 'object',
        properties: {
          id: int,
          titulo: str,
          etapa: str,
          montoEstimado: num,
          fechaCierreEstimada: nullable(str),
          prospectoId: nullable(int),
          clienteId: nullable(int),
          contactoNombre: str,
          vehiculoInteresId: nullable(int),
          vendedorId: int,
        },
      },
      OportunidadEntrada: {
        type: 'object',
        required: ['titulo'],
        properties: {
          titulo: str,
          prospectoId: int,
          clienteId: int,
          vehiculoInteresId: int,
          montoEstimado: num,
          fechaCierreEstimada: { ...str, format: 'date' },
          vendedorId: int,
        },
      },
      Vehiculo: {
        type: 'object',
        properties: {
          id: int,
          vin: str,
          marca: str,
          modelo: str,
          anio: int,
          version: nullable(str),
          tipo: str,
          condicion: str,
          color: str,
          transmision: str,
          combustible: str,
          motor: nullable(str),
          kilometraje: int,
          precio: num,
          estado: str,
        },
      },
      VehiculoEntrada: {
        type: 'object',
        required: [
          'vin',
          'marca',
          'modelo',
          'anio',
          'tipo',
          'condicion',
          'color',
          'transmision',
          'combustible',
          'precio',
        ],
        properties: {
          vin: { ...str, example: '1HGCM82633A004352', description: '17 caracteres, sin I/O/Q. Único.' },
          marca: str,
          modelo: str,
          anio: int,
          version: str,
          tipo: enumStr(['Sedán', 'Hatchback', 'SUV', 'Pickup', 'Camioneta', 'Microbús', 'Deportivo']),
          condicion: enumStr(['Nuevo', 'Usado']),
          color: str,
          transmision: enumStr(['Automática', 'Manual']),
          combustible: enumStr(['Gasolina', 'Diésel', 'Híbrido', 'Eléctrico']),
          motor: str,
          kilometraje: int,
          precio: num,
          descripcion: str,
        },
      },
      Cotizacion: {
        type: 'object',
        properties: {
          id: int,
          correlativo: { ...str, example: 'COT-2026-000012' },
          oportunidadId: int,
          contactoNombre: str,
          vendedorId: int,
          fecha: str,
          vigenciaHasta: str,
          subtotal: num,
          descuento: num,
          baseImponible: num,
          ivaTasa: num,
          iva: num,
          total: num,
          estado: enumStr(['Borrador', 'Enviada', 'Aceptada', 'Rechazada', 'Vencida', 'Convertida']),
          lineas: {
            type: 'array',
            items: {
              type: 'object',
              properties: { vehiculoId: int, precioUnitario: num, descuento: num, subtotal: num, vin: str },
            },
          },
        },
      },
      CotizacionEntrada: {
        type: 'object',
        required: ['oportunidadId', 'lineas'],
        properties: {
          oportunidadId: int,
          vigenciaHasta: { ...str, format: 'date' },
          observaciones: str,
          lineas: {
            type: 'array',
            items: { type: 'object', properties: { vehiculoId: int, descuento: num } },
          },
        },
      },
      Venta: {
        type: 'object',
        properties: {
          id: int,
          correlativo: str,
          fecha: str,
          metodoPago: str,
          total: num,
          cotizacionId: int,
          cotizacionCorrelativo: str,
          clienteId: int,
          clienteNombre: str,
          vendedorId: int,
          vendedorNombre: str,
          vehiculos: str,
        },
      },
      VentaEntrada: {
        type: 'object',
        required: ['cotizacionId', 'metodoPago'],
        properties: {
          cotizacionId: int,
          metodoPago: enumStr(['Contado', 'Financiamiento', 'Transferencia', 'Cheque']),
          observaciones: str,
          cliente: {
            type: 'object',
            description: 'Datos para completar el cliente si se convierte un prospecto',
            properties: { dpi: str, nit: str, direccion: str },
          },
        },
      },
    },
  },
};
