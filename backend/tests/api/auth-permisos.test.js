/**
 * HU-01: autenticación, expiración de sesión, límite de intentos y
 * permisos por rol validados en el backend.
 */
const jwt = require('jsonwebtoken');
const { prepararBd } = require('../helpers/bd');
const { app, request, token, api, USUARIOS } = require('../helpers/api');
const { crearApp } = require('../../src/app');
const { pool } = require('../../src/db/pool');

let tAdmin;
let tGerente;
let tVendedor;

beforeAll(async () => {
  await prepararBd();
  [tAdmin, tGerente, tVendedor] = await Promise.all([token('admin'), token('gerente'), token('vendedor')]);
});
afterAll(() => pool.end());

describe('Inicio de sesión', () => {
  test('credenciales válidas devuelven token y datos del usuario SIN contraseña', async () => {
    const res = await request(app).post('/api/auth/login').send(USUARIOS.gerente);
    expect(res.status).toBe(200);
    expect(res.body.token).toEqual(expect.any(String));
    expect(res.body.usuario).toMatchObject({ email: 'gerente@autoventas.gt', rol: 'GERENTE' });
    const texto = JSON.stringify(res.body);
    expect(texto).not.toMatch(/password|hash|\$2[aby]\$/i);
  });

  test('contraseña incorrecta → 401 con mensaje genérico', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@autoventas.gt', password: 'mala' });
    expect(res.status).toBe(401);
    expect(res.body.mensaje).toBe('Correo o contraseña incorrectos.');
  });

  test('usuario inexistente → 401 con el mismo mensaje (no revela correos)', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nadie@autoventas.gt', password: 'Algo1234' });
    expect(res.status).toBe(401);
    expect(res.body.mensaje).toBe('Correo o contraseña incorrectos.');
  });

  test('datos con formato inválido → 400 con errores por campo', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'no-es-correo' });
    expect(res.status).toBe(400);
    expect(res.body.errores.map((e) => e.campo)).toEqual(expect.arrayContaining(['email', 'password']));
  });

  test('límite de intentos fallidos → 429', async () => {
    const appLimitada = crearApp({ login: { maxIntentos: 3, ventanaMinutos: 15 } });
    for (let i = 0; i < 3; i += 1) {
      const r = await request(appLimitada)
        .post('/api/auth/login')
        .send({ email: 'admin@autoventas.gt', password: 'x1' });
      expect(r.status).toBe(401);
    }
    const bloqueado = await request(appLimitada)
      .post('/api/auth/login')
      .send({ email: 'admin@autoventas.gt', password: 'Admin123!' });
    expect(bloqueado.status).toBe(429);
    expect(bloqueado.body.mensaje).toMatch(/Demasiados intentos/);
  });

  test('usuario desactivado no puede iniciar sesión y su token deja de servir', async () => {
    const tV2 = await token('vendedora2');
    await api(tAdmin).patch('/api/usuarios/4/activo').send({ activo: false }).expect(200);
    const login = await request(app).post('/api/auth/login').send(USUARIOS.vendedora2);
    expect(login.status).toBe(401);
    expect((await api(tV2).get('/api/clientes')).status).toBe(401);
    await api(tAdmin).patch('/api/usuarios/4/activo').send({ activo: true }).expect(200);
  });
});

describe('Token JWT', () => {
  test('sin token → 401', async () => {
    expect((await request(app).get('/api/clientes')).status).toBe(401);
  });

  test('token manipulado → 401', async () => {
    const res = await api(`${tAdmin}x`).get('/api/clientes');
    expect(res.status).toBe(401);
  });

  test('token expirado → 401 con mensaje de sesión expirada', async () => {
    const vencido = jwt.sign(
      { sub: 1, rol: 'ADMIN', exp: Math.floor(Date.now() / 1000) - 60 },
      process.env.JWT_SECRET,
    );
    const res = await api(vencido).get('/api/clientes');
    expect(res.status).toBe(401);
    expect(res.body.mensaje).toMatch(/expiró/);
  });

  test('el rol se toma de la base de datos, no del token (no se puede falsificar)', async () => {
    // Token firmado con rol ADMIN pero para el usuario 3 (vendedor): debe seguir siendo vendedor.
    const falso = jwt.sign({ sub: 3, rol: 'ADMIN' }, process.env.JWT_SECRET, { expiresIn: '1h' });
    expect((await api(falso).get('/api/usuarios')).status).toBe(403);
  });
});

describe('Permisos por rol (validados en el backend)', () => {
  test.each([
    ['vendedor', 'get', '/api/usuarios', 403],
    ['vendedor', 'get', '/api/roles', 403],
    ['vendedor', 'get', '/api/reportes/dashboard', 403],
    ['vendedor', 'post', '/api/vehiculos', 403],
    ['vendedor', 'delete', '/api/clientes/1', 403],
    ['vendedor', 'patch', '/api/prospectos/1/asignar', 403],
    ['gerente', 'get', '/api/usuarios', 403],
    ['gerente', 'get', '/api/reportes/dashboard', 200],
    ['admin', 'get', '/api/usuarios', 200],
    ['admin', 'get', '/api/reportes/dashboard', 200],
  ])('%s %s %s → %i', async (rol, metodo, url, esperado) => {
    const t = { admin: tAdmin, gerente: tGerente, vendedor: tVendedor }[rol];
    const res = await api(t)[metodo](url).send({});
    expect(res.status).toBe(esperado);
  });

  test('el vendedor solo ve sus propios clientes', async () => {
    const res = await api(tVendedor).get('/api/clientes?tamano=100');
    expect(res.status).toBe(200);
    expect(res.body.total).toBeGreaterThan(0);
    expect(res.body.datos.every((c) => c.vendedorId === 3)).toBe(true);
    const gerente = await api(tGerente).get('/api/clientes?tamano=100');
    expect(gerente.body.total).toBeGreaterThan(res.body.total);
  });

  test('el vendedor no puede ver ni modificar un cliente ajeno (404)', async () => {
    expect((await api(tVendedor).get('/api/clientes/2')).status).toBe(404);
    const res = await api(tVendedor)
      .put('/api/clientes/2')
      .send({ nombres: 'Hackeo', apellidos: 'Prueba', telefono: '5555-5555' });
    expect(res.status).toBe(404);
  });

  test('el vendedor no puede asignarse registros de otro vendedor', async () => {
    const res = await api(tVendedor)
      .post('/api/prospectos')
      .send({ nombres: 'Lead', apellidos: 'Ajeno', telefono: '5000-1234', fuente: 'Llamada', vendedorId: 4 });
    expect(res.status).toBe(403);
  });

  test('el vendedor solo ve sus cotizaciones y ventas', async () => {
    const cot = await api(tVendedor).get('/api/cotizaciones?tamano=100');
    expect(cot.body.datos.every((c) => c.vendedorId === 3)).toBe(true);
    const ventas = await api(tVendedor).get('/api/ventas?tamano=100');
    expect(ventas.body.datos.every((v) => v.vendedorId === 3)).toBe(true);
    expect((await api(tVendedor).get('/api/ventas/2')).status).toBe(404); // venta de otra vendedora
  });

  test('las respuestas de usuarios nunca incluyen contraseñas', async () => {
    const res = await api(tAdmin).get('/api/usuarios?tamano=100');
    expect(JSON.stringify(res.body)).not.toMatch(/password|hash/i);
  });
});

describe('Administración de usuarios', () => {
  test('el administrador crea un usuario con contraseña segura', async () => {
    const res = await api(tAdmin)
      .post('/api/usuarios')
      .send({ nombre: 'Nuevo Vendedor', email: 'NUEVO@autoventas.gt', password: 'Segura123', rolId: 3 });
    expect(res.status).toBe(201);
    expect(res.body.email).toBe('nuevo@autoventas.gt');
    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nuevo@autoventas.gt', password: 'Segura123' });
    expect(login.status).toBe(200);
  });

  test('rechaza contraseña débil y correo duplicado', async () => {
    const debil = await api(tAdmin)
      .post('/api/usuarios')
      .send({ nombre: 'Otro', email: 'otro@autoventas.gt', password: '123', rolId: 3 });
    expect(debil.status).toBe(400);
    const dup = await api(tAdmin)
      .post('/api/usuarios')
      .send({ nombre: 'Dup', email: 'gerente@autoventas.gt', password: 'Segura123', rolId: 3 });
    expect(dup.status).toBe(409);
  });

  test('el administrador no puede desactivarse a sí mismo', async () => {
    const res = await api(tAdmin).patch('/api/usuarios/1/activo').send({ activo: false });
    expect(res.status).toBe(409);
  });
});
