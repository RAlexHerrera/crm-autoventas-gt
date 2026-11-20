/**
 * Genera la colección de Postman (AutoVentas_CRM.postman_collection.json) con
 * todos los endpoints y sus casos de error. Cada solicitud incluye pruebas
 * automáticas (pm.test) para poder ejecutarla con Newman.
 *
 *   node tests/postman/generar-coleccion.js
 *
 * La colección es re-ejecutable: genera VIN, correos y teléfonos aleatorios.
 */
const fs = require('fs');
const path = require('path');

const tokens = { admin: '{{tokenAdmin}}', gerente: '{{tokenGerente}}', vendedor: '{{tokenVendedor}}' };

function solicitud(
  nombre,
  metodo,
  ruta,
  { rol, cuerpo, estado = 200, pruebas = [], preparar = [], sinToken = false } = {},
) {
  const headers = [{ key: 'Content-Type', value: 'application/json' }];
  if (rol && !sinToken) headers.push({ key: 'Authorization', value: `Bearer ${tokens[rol] || rol}` });
  const [rutaBase, query] = ruta.split('?');
  const evento = [
    {
      listen: 'test',
      script: {
        type: 'text/javascript',
        exec: [`pm.test('Código HTTP ${estado}', () => pm.response.to.have.status(${estado}));`, ...pruebas],
      },
    },
  ];
  if (preparar.length)
    evento.unshift({ listen: 'prerequest', script: { type: 'text/javascript', exec: preparar } });
  return {
    name: nombre,
    event: evento,
    request: {
      method: metodo,
      header: headers,
      ...(cuerpo ? { body: { mode: 'raw', raw: JSON.stringify(cuerpo, null, 2) } } : {}),
      url: {
        raw: `{{baseUrl}}${ruta}`,
        host: ['{{baseUrl}}'],
        path: rutaBase.split('/').filter(Boolean),
        ...(query
          ? { query: query.split('&').map((p) => ({ key: p.split('=')[0], value: p.split('=')[1] })) }
          : {}),
      },
    },
  };
}

const json = 'const r = pm.response.json();';
const sinPassword =
  "pm.test('No expone contraseñas', () => pm.expect(pm.response.text()).to.not.match(/password|hash/i));";

const carpetas = [
  {
    name: '01 Autenticación (HU-01)',
    item: [
      solicitud('Login administrador', 'POST', '/api/auth/login', {
        cuerpo: { email: 'admin@autoventas.gt', password: 'Admin123!' },
        pruebas: [
          json,
          "pm.collectionVariables.set('tokenAdmin', r.token);",
          "pm.test('Rol ADMIN', () => pm.expect(r.usuario.rol).to.eql('ADMIN'));",
          sinPassword,
        ],
      }),
      solicitud('Login gerente', 'POST', '/api/auth/login', {
        cuerpo: { email: 'gerente@autoventas.gt', password: 'Gerente123!' },
        pruebas: [json, "pm.collectionVariables.set('tokenGerente', r.token);"],
      }),
      solicitud('Login vendedor', 'POST', '/api/auth/login', {
        cuerpo: { email: 'vendedor@autoventas.gt', password: 'Vendedor123!' },
        pruebas: [json, "pm.collectionVariables.set('tokenVendedor', r.token);"],
      }),
      solicitud('ERROR: contraseña incorrecta → 401', 'POST', '/api/auth/login', {
        cuerpo: { email: 'admin@autoventas.gt', password: 'incorrecta1' },
        estado: 401,
        pruebas: [
          json,
          "pm.test('Mensaje genérico', () => pm.expect(r.mensaje).to.eql('Correo o contraseña incorrectos.'));",
        ],
      }),
      solicitud('ERROR: datos inválidos → 400', 'POST', '/api/auth/login', {
        cuerpo: { email: 'no-es-correo', password: '' },
        estado: 400,
        pruebas: [json, "pm.test('Errores por campo', () => pm.expect(r.errores.length).to.be.above(0));"],
      }),
      solicitud('Perfil de la sesión', 'GET', '/api/auth/perfil', {
        rol: 'vendedor',
        pruebas: [json, "pm.test('Es vendedor', () => pm.expect(r.rol).to.eql('VENDEDOR'));"],
      }),
      solicitud('ERROR: sin token → 401', 'GET', '/api/clientes', { estado: 401 }),
      solicitud('ERROR: token inválido → 401', 'GET', '/api/clientes', {
        rol: 'token.invalido.x',
        estado: 401,
      }),
      solicitud(
        'ERROR: cambiar contraseña con actual incorrecta → 400',
        'POST',
        '/api/auth/cambiar-password',
        {
          rol: 'vendedor',
          cuerpo: { actual: 'NoEsLaClave1', nueva: 'NuevaClave123' },
          estado: 400,
        },
      ),
    ],
  },
  {
    name: '02 Usuarios y roles (HU-01)',
    item: [
      solicitud('Listar usuarios (admin)', 'GET', '/api/usuarios?pagina=1&tamano=10', {
        rol: 'admin',
        pruebas: [json, sinPassword],
      }),
      solicitud('ERROR: vendedor lista usuarios → 403', 'GET', '/api/usuarios', {
        rol: 'vendedor',
        estado: 403,
      }),
      solicitud('ERROR: gerente lista usuarios → 403', 'GET', '/api/usuarios', {
        rol: 'gerente',
        estado: 403,
      }),
      solicitud('Vendedores activos (todos los roles)', 'GET', '/api/usuarios/vendedores', {
        rol: 'vendedor',
      }),
      solicitud('Crear usuario vendedor', 'POST', '/api/usuarios', {
        rol: 'admin',
        preparar: ["pm.collectionVariables.set('sufijo', Date.now().toString().slice(-7));"],
        cuerpo: {
          nombre: 'Vendedor Postman',
          email: 'postman{{sufijo}}@autoventas.gt',
          password: 'Postman123',
          rolId: 3,
        },
        estado: 201,
        pruebas: [json, "pm.collectionVariables.set('usuarioNuevoId', r.id);", sinPassword],
      }),
      solicitud('ERROR: contraseña débil → 400', 'POST', '/api/usuarios', {
        rol: 'admin',
        cuerpo: { nombre: 'Débil', email: 'debil{{sufijo}}@autoventas.gt', password: '123', rolId: 3 },
        estado: 400,
      }),
      solicitud('ERROR: correo duplicado → 409', 'POST', '/api/usuarios', {
        rol: 'admin',
        cuerpo: { nombre: 'Duplicado', email: 'gerente@autoventas.gt', password: 'Postman123', rolId: 3 },
        estado: 409,
      }),
      solicitud('Desactivar usuario', 'PATCH', '/api/usuarios/{{usuarioNuevoId}}/activo', {
        rol: 'admin',
        cuerpo: { activo: false },
      }),
      solicitud('ERROR: admin se desactiva a sí mismo → 409', 'PATCH', '/api/usuarios/1/activo', {
        rol: 'admin',
        cuerpo: { activo: false },
        estado: 409,
      }),
      solicitud('Listar roles', 'GET', '/api/roles', {
        rol: 'admin',
        pruebas: [json, "pm.test('3 roles', () => pm.expect(r.length).to.eql(3));"],
      }),
    ],
  },
  {
    name: '03 Vehículos (HU-07, HU-08)',
    item: [
      solicitud(
        'Catálogo con filtros',
        'GET',
        '/api/vehiculos?estado=Disponible&marca=Toyota&orden=precio_asc',
        {
          rol: 'vendedor',
          pruebas: [
            json,
            "pm.test('Solo disponibles Toyota', () => r.datos.forEach((v) => { pm.expect(v.estado).to.eql('Disponible'); pm.expect(v.marca).to.eql('Toyota'); }));",
          ],
        },
      ),
      solicitud('Catálogos para filtros', 'GET', '/api/vehiculos/catalogos', { rol: 'vendedor' }),
      solicitud('Resumen de inventario', 'GET', '/api/vehiculos/inventario', { rol: 'gerente' }),
      solicitud('Registrar vehículo (gerente)', 'POST', '/api/vehiculos', {
        rol: 'gerente',
        preparar: [
          "const c = 'ABCDEFGHJKLMNPRSTUVWXYZ0123456789';",
          "let vin = ''; for (let i = 0; i < 17; i++) vin += c[Math.floor(Math.random() * c.length)];",
          "pm.collectionVariables.set('vin', vin);",
        ],
        cuerpo: {
          vin: '{{vin}}',
          marca: 'Toyota',
          modelo: 'Yaris',
          anio: 2026,
          version: 'XLS',
          tipo: 'Sedán',
          condicion: 'Nuevo',
          color: 'Blanco',
          transmision: 'Automática',
          combustible: 'Gasolina',
          motor: '1.5 L',
          kilometraje: 0,
          precio: 165000,
        },
        estado: 201,
        pruebas: [
          json,
          "pm.collectionVariables.set('vehiculoId', r.id);",
          "pm.test('Disponible', () => pm.expect(r.estado).to.eql('Disponible'));",
        ],
      }),
      solicitud('ERROR: VIN duplicado → 409', 'POST', '/api/vehiculos', {
        rol: 'gerente',
        cuerpo: {
          vin: '{{vin}}',
          marca: 'Toyota',
          modelo: 'Yaris',
          anio: 2026,
          tipo: 'Sedán',
          condicion: 'Nuevo',
          color: 'Rojo',
          transmision: 'Manual',
          combustible: 'Gasolina',
          precio: 160000,
        },
        estado: 409,
      }),
      solicitud('ERROR: VIN inválido (con O) → 400', 'POST', '/api/vehiculos', {
        rol: 'gerente',
        cuerpo: {
          vin: '1HGCM82633AO04352',
          marca: 'Honda',
          modelo: 'Fit',
          anio: 2024,
          tipo: 'Hatchback',
          condicion: 'Usado',
          color: 'Azul',
          transmision: 'Manual',
          combustible: 'Gasolina',
          kilometraje: 1000,
          precio: 90000,
        },
        estado: 400,
      }),
      solicitud('ERROR: vendedor registra vehículo → 403', 'POST', '/api/vehiculos', {
        rol: 'vendedor',
        cuerpo: {},
        estado: 403,
      }),
      solicitud('Ficha técnica', 'GET', '/api/vehiculos/{{vehiculoId}}', { rol: 'vendedor' }),
      solicitud('ERROR: marcar Vendido manualmente → 400', 'PATCH', '/api/vehiculos/{{vehiculoId}}/estado', {
        rol: 'gerente',
        cuerpo: { estado: 'Vendido' },
        estado: 400,
      }),
      solicitud('ERROR: vehículo inexistente → 404', 'GET', '/api/vehiculos/999999', {
        rol: 'vendedor',
        estado: 404,
      }),
    ],
  },
  {
    name: '04 Clientes e interacciones (HU-02, HU-03)',
    item: [
      solicitud('Listar mis clientes (vendedor)', 'GET', '/api/clientes?q=&pagina=1', {
        rol: 'vendedor',
        pruebas: [
          json,
          "pm.test('Solo los propios', () => r.datos.forEach((c) => pm.expect(c.vendedorId).to.eql(3)));",
        ],
      }),
      solicitud('Registrar cliente', 'POST', '/api/clientes', {
        rol: 'vendedor',
        cuerpo: {
          nombres: 'Cliente',
          apellidos: 'Postman {{sufijo}}',
          telefono: '55{{sufijo}}',
          nit: 'CF',
          email: 'cliente{{sufijo}}@correo.gt',
          clasificacion: 'Nuevo',
        },
        estado: 201,
        pruebas: [json, "pm.collectionVariables.set('clienteId', r.id);"],
      }),
      solicitud('ERROR: DPI inválido → 400', 'POST', '/api/clientes', {
        rol: 'vendedor',
        cuerpo: { nombres: 'Mal', apellidos: 'DPI', telefono: '55001122', dpi: '123' },
        estado: 400,
      }),
      solicitud('ERROR: cliente de otro vendedor → 404', 'GET', '/api/clientes/2', {
        rol: 'vendedor',
        estado: 404,
      }),
      solicitud('Registrar interacción', 'POST', '/api/interacciones', {
        rol: 'vendedor',
        cuerpo: {
          clienteId: '{{clienteId}}',
          tipo: 'Llamada',
          descripcion: 'Llamada de seguimiento desde Postman',
        },
        estado: 201,
      }),
      solicitud('Historial del cliente', 'GET', '/api/interacciones?clienteId={{clienteId}}', {
        rol: 'vendedor',
        pruebas: [json, "pm.test('Tiene historial', () => pm.expect(r.length).to.be.above(0));"],
      }),
      solicitud('ERROR: tipo «Sistema» manual → 400', 'POST', '/api/interacciones', {
        rol: 'vendedor',
        cuerpo: { clienteId: '{{clienteId}}', tipo: 'Sistema', descripcion: 'No permitido' },
        estado: 400,
      }),
    ],
  },
  {
    name: '05 Prospectos y oportunidades (HU-04, HU-05, HU-06)',
    item: [
      solicitud('Registrar prospecto', 'POST', '/api/prospectos', {
        rol: 'vendedor',
        cuerpo: {
          nombres: 'Prospecto',
          apellidos: 'Postman {{sufijo}}',
          telefono: '44{{sufijo}}',
          email: 'prospecto{{sufijo}}@correo.gt',
          fuente: 'Sitio web',
          interes: 'Sedán',
        },
        estado: 201,
        pruebas: [json, "pm.collectionVariables.set('prospectoId', r.id);"],
      }),
      solicitud('ERROR: prospecto duplicado → 409', 'POST', '/api/prospectos', {
        rol: 'vendedor',
        cuerpo: { nombres: 'Otro', apellidos: 'Duplicado', telefono: '44{{sufijo}}', fuente: 'Llamada' },
        estado: 409,
        pruebas: [
          json,
          "pm.test('Devuelve coincidencias', () => pm.expect(r.duplicados.length).to.be.above(0));",
        ],
      }),
      solicitud('Verificar duplicados', 'GET', '/api/prospectos/verificar-duplicados?telefono=5501-1001', {
        rol: 'vendedor',
      }),
      solicitud(
        'ERROR: vendedor asigna prospecto → 403',
        'PATCH',
        '/api/prospectos/{{prospectoId}}/asignar',
        {
          rol: 'vendedor',
          cuerpo: { vendedorId: 4 },
          estado: 403,
        },
      ),
      solicitud('Asignar vendedor (gerente)', 'PATCH', '/api/prospectos/{{prospectoId}}/asignar', {
        rol: 'gerente',
        cuerpo: { vendedorId: 3 },
      }),
      solicitud('Crear oportunidad', 'POST', '/api/oportunidades', {
        rol: 'vendedor',
        cuerpo: {
          titulo: 'Yaris para prospecto Postman',
          prospectoId: '{{prospectoId}}',
          vehiculoInteresId: '{{vehiculoId}}',
          montoEstimado: 165000,
        },
        estado: 201,
        pruebas: [json, "pm.collectionVariables.set('oportunidadId', r.id);"],
      }),
      solicitud('Avanzar etapa a Contacto', 'PATCH', '/api/oportunidades/{{oportunidadId}}/etapa', {
        rol: 'vendedor',
        cuerpo: { etapa: 'Contacto' },
        pruebas: [json, "pm.test('Etapa Contacto', () => pm.expect(r.etapa).to.eql('Contacto'));"],
      }),
      solicitud(
        'ERROR: marcar Ganado manualmente → 400',
        'PATCH',
        '/api/oportunidades/{{oportunidadId}}/etapa',
        {
          rol: 'vendedor',
          cuerpo: { etapa: 'Ganado' },
          estado: 400,
        },
      ),
      solicitud('ERROR: Perdido sin motivo → 400', 'PATCH', '/api/oportunidades/{{oportunidadId}}/etapa', {
        rol: 'vendedor',
        cuerpo: { etapa: 'Perdido' },
        estado: 400,
      }),
      solicitud('Resumen por etapas', 'GET', '/api/oportunidades/resumen-etapas', { rol: 'vendedor' }),
    ],
  },
  {
    name: '06 Cotizaciones (HU-09, HU-14)',
    item: [
      solicitud('ERROR: cotizar vehículo vendido → 409', 'POST', '/api/cotizaciones', {
        rol: 'vendedor',
        cuerpo: { oportunidadId: '{{oportunidadId}}', lineas: [{ vehiculoId: 1 }] },
        estado: 409,
      }),
      solicitud('ERROR: descuento mayor al precio → 400', 'POST', '/api/cotizaciones', {
        rol: 'vendedor',
        cuerpo: {
          oportunidadId: '{{oportunidadId}}',
          lineas: [{ vehiculoId: '{{vehiculoId}}', descuento: 999999 }],
        },
        estado: 400,
      }),
      solicitud('Crear cotización (IVA 12 %)', 'POST', '/api/cotizaciones', {
        rol: 'vendedor',
        cuerpo: {
          oportunidadId: '{{oportunidadId}}',
          observaciones: 'Incluye polarizado',
          lineas: [{ vehiculoId: '{{vehiculoId}}', descuento: 5000 }],
        },
        estado: 201,
        pruebas: [
          json,
          "pm.collectionVariables.set('cotizacionId', r.id);",
          "pm.test('Correlativo COT-AAAA-NNNNNN', () => pm.expect(r.correlativo).to.match(/^COT-\\d{4}-\\d{6}$/));",
          "pm.test('Base = 165000 - 5000', () => pm.expect(r.baseImponible).to.eql(160000));",
          "pm.test('IVA 12 %', () => pm.expect(r.iva).to.eql(19200));",
          "pm.test('Total', () => pm.expect(r.total).to.eql(179200));",
        ],
      }),
      solicitud('Detalle de cotización', 'GET', '/api/cotizaciones/{{cotizacionId}}', { rol: 'vendedor' }),
      solicitud('ERROR: Borrador → Aceptada → 409', 'PATCH', '/api/cotizaciones/{{cotizacionId}}/estado', {
        rol: 'vendedor',
        cuerpo: { estado: 'Aceptada' },
        estado: 409,
      }),
      solicitud('Marcar como Enviada', 'PATCH', '/api/cotizaciones/{{cotizacionId}}/estado', {
        rol: 'vendedor',
        cuerpo: { estado: 'Enviada' },
      }),
      solicitud(
        'Marcar como Aceptada (reserva vehículo)',
        'PATCH',
        '/api/cotizaciones/{{cotizacionId}}/estado',
        {
          rol: 'vendedor',
          cuerpo: { estado: 'Aceptada' },
          pruebas: [
            json,
            "pm.test('Vehículo reservado', () => pm.expect(r.lineas[0].vehiculoEstado).to.eql('Reservado'));",
          ],
        },
      ),
      solicitud('Descargar PDF', 'GET', '/api/cotizaciones/{{cotizacionId}}/pdf', {
        rol: 'vendedor',
        pruebas: [
          "pm.test('Es PDF', () => pm.expect(pm.response.headers.get('Content-Type')).to.eql('application/pdf'));",
        ],
      }),
      solicitud('Listar cotizaciones por estado', 'GET', '/api/cotizaciones?estado=Aceptada', {
        rol: 'gerente',
      }),
    ],
  },
  {
    name: '07 Ventas (HU-10)',
    item: [
      solicitud('Registrar venta (transacción)', 'POST', '/api/ventas', {
        rol: 'vendedor',
        cuerpo: { cotizacionId: '{{cotizacionId}}', metodoPago: 'Contado', cliente: { nit: 'CF' } },
        estado: 201,
        pruebas: [
          json,
          "pm.collectionVariables.set('ventaId', r.id);",
          "pm.test('Correlativo VTA', () => pm.expect(r.correlativo).to.match(/^VTA-/));",
        ],
      }),
      solicitud('Vehículo quedó Vendido', 'GET', '/api/vehiculos/{{vehiculoId}}', {
        rol: 'vendedor',
        pruebas: [json, "pm.test('Vendido', () => pm.expect(r.estado).to.eql('Vendido'));"],
      }),
      solicitud('Oportunidad quedó Ganado', 'GET', '/api/oportunidades/{{oportunidadId}}', {
        rol: 'vendedor',
        pruebas: [json, "pm.test('Ganado', () => pm.expect(r.etapa).to.eql('Ganado'));"],
      }),
      solicitud('Prospecto convertido en cliente', 'GET', '/api/prospectos/{{prospectoId}}', {
        rol: 'vendedor',
        pruebas: [
          json,
          "pm.test('Convertido', () => pm.expect(r.estado).to.eql('Convertido'));",
          "pm.test('Vinculado a cliente', () => pm.expect(r.clienteId).to.be.a('number'));",
        ],
      }),
      solicitud('ERROR: venta duplicada → 409', 'POST', '/api/ventas', {
        rol: 'vendedor',
        cuerpo: { cotizacionId: '{{cotizacionId}}', metodoPago: 'Contado' },
        estado: 409,
      }),
      solicitud('ERROR: cotización no aceptada → 409', 'POST', '/api/ventas', {
        rol: 'gerente',
        cuerpo: { cotizacionId: 9, metodoPago: 'Contado' },
        estado: 409,
      }),
      solicitud('ERROR: método de pago inválido → 400', 'POST', '/api/ventas', {
        rol: 'vendedor',
        cuerpo: { cotizacionId: '{{cotizacionId}}', metodoPago: 'Trueque' },
        estado: 400,
      }),
      solicitud('Listar ventas', 'GET', '/api/ventas?pagina=1', { rol: 'gerente' }),
      solicitud('Detalle de venta', 'GET', '/api/ventas/{{ventaId}}', { rol: 'vendedor' }),
    ],
  },
  {
    name: '08 Reportes y dashboard (HU-11, 12, 13, 15)',
    item: [
      solicitud('Dashboard gerente', 'GET', '/api/reportes/dashboard', {
        rol: 'gerente',
        pruebas: [json, "pm.test('Tiene KPI', () => pm.expect(r.kpis.ventasCantidad).to.be.above(0));"],
      }),
      solicitud('ERROR: vendedor abre dashboard → 403', 'GET', '/api/reportes/dashboard', {
        rol: 'vendedor',
        estado: 403,
      }),
      solicitud('Panel personal del vendedor', 'GET', '/api/reportes/mi-panel', { rol: 'vendedor' }),
      solicitud('Ventas por período (mensual)', 'GET', '/api/reportes/ventas-periodo?agrupacion=mes', {
        rol: 'gerente',
      }),
      solicitud('Rendimiento por vendedor', 'GET', '/api/reportes/rendimiento-vendedores', {
        rol: 'gerente',
      }),
      solicitud('Conversión de prospectos', 'GET', '/api/reportes/conversion-prospectos', { rol: 'gerente' }),
      solicitud('Vehículos más vendidos', 'GET', '/api/reportes/vehiculos-mas-vendidos?limite=5', {
        rol: 'gerente',
      }),
      solicitud('Funnel de ventas', 'GET', '/api/reportes/funnel', { rol: 'gerente' }),
      solicitud('Clasificación de clientes', 'GET', '/api/reportes/clasificacion-clientes', {
        rol: 'gerente',
      }),
      solicitud(
        'ERROR: rango de fechas invertido → 400',
        'GET',
        '/api/reportes/funnel?desde=2026-12-31&hasta=2026-01-01',
        { rol: 'gerente', estado: 400 },
      ),
    ],
  },
  {
    name: '09 Sistema',
    item: [
      solicitud('Salud del servicio', 'GET', '/api/salud'),
      solicitud('Especificación OpenAPI', 'GET', '/api/openapi.json'),
      solicitud('ERROR: ruta inexistente → 404', 'GET', '/api/no-existe', { rol: 'vendedor', estado: 404 }),
    ],
  },
];

const coleccion = {
  info: {
    name: 'CRM AutoVentas GT — API',
    description:
      'Todos los endpoints de la API con casos exitosos y de error. Ejecute las carpetas en orden (la carpeta 01 obtiene los tokens). ' +
      'baseUrl por defecto: http://localhost:3000',
    schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
  },
  variable: [
    { key: 'baseUrl', value: 'http://localhost:3000' },
    { key: 'tokenAdmin', value: '' },
    { key: 'tokenGerente', value: '' },
    { key: 'tokenVendedor', value: '' },
    { key: 'sufijo', value: '' },
  ],
  item: carpetas,
};

const destino = path.join(__dirname, 'AutoVentas_CRM.postman_collection.json');
fs.writeFileSync(destino, `${JSON.stringify(coleccion, null, 2)}\n`);
console.log(
  `Colección generada: ${destino} (${carpetas.reduce((a, c) => a + c.item.length, 0)} solicitudes)`,
);
