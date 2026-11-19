/**
 * HU-10: conversión de cotización aceptada en venta mediante UNA transacción.
 * Escenarios críticos del plan de pruebas (Fase 2, 12.3): venta correcta,
 * venta duplicada, concurrencia, conversión de prospecto y ROLLBACK total.
 */
const { prepararBd } = require('../helpers/bd');
const { token, api } = require('../helpers/api');
const { pool } = require('../../src/db/pool');
const ventasRepo = require('../../src/modules/ventas/ventas.repository');

let tVendedor;
let tGerente;

beforeAll(async () => {
  await prepararBd();
  [tVendedor, tGerente] = await Promise.all([token('vendedor'), token('gerente')]);
});
afterEach(() => jest.restoreAllMocks());
afterAll(() => pool.end());

const contar = async (sql, params = []) => (await pool.query(sql, params))[0][0].n;

describe('Venta a partir de cotización aceptada', () => {
  test('cotización 7 (cliente 5, RAV4 reservada): registra venta y actualiza todo', async () => {
    const res = await api(tVendedor)
      .post('/api/ventas')
      .send({ cotizacionId: 7, metodoPago: 'Financiamiento' });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ cotizacionId: 7, clienteId: 5, vendedorId: 3, total: 380800 });
    expect(res.body.correlativo).toMatch(/^VTA-\d{4}-\d{6}$/);

    expect((await api(tVendedor).get('/api/vehiculos/3')).body.estado).toBe('Vendido');
    expect((await api(tVendedor).get('/api/oportunidades/7')).body.etapa).toBe('Ganado');
    expect((await api(tVendedor).get('/api/cotizaciones/7')).body.estado).toBe('Convertida');
    // Primera compra: el cliente pasa de "Nuevo" a "Regular" (HU-15).
    expect((await api(tVendedor).get('/api/clientes/5')).body.clasificacion).toBe('Regular');
  });

  test('venta duplicada de la misma cotización → 409', async () => {
    const res = await api(tVendedor).post('/api/ventas').send({ cotizacionId: 7, metodoPago: 'Contado' });
    expect(res.status).toBe(409);
    expect(res.body.mensaje).toMatch(/ya fue convertida/);
    expect(await contar('SELECT COUNT(*) n FROM ventas WHERE cotizacion_id = 7')).toBe(1);
  });

  test('cotización no aceptada (Borrador/Rechazada) → 409', async () => {
    expect(
      (await api(tGerente).post('/api/ventas').send({ cotizacionId: 10, metodoPago: 'Contado' })).status,
    ).toBe(409);
    expect(
      (await api(tGerente).post('/api/ventas').send({ cotizacionId: 9, metodoPago: 'Contado' })).status,
    ).toBe(409);
  });

  test('cotización ajena para el vendedor → 404', async () => {
    expect(
      (await api(tVendedor).post('/api/ventas').send({ cotizacionId: 10, metodoPago: 'Contado' })).status,
    ).toBe(404);
  });

  test('la base de datos impide vender dos veces el mismo vehículo (UNIQUE)', async () => {
    await expect(
      pool.query('INSERT INTO venta_vehiculos (venta_id, vehiculo_id, precio_final) VALUES (2, 1, 1000)'),
    ).rejects.toMatchObject({ code: 'ER_DUP_ENTRY' });
  });
});

describe('Rollback y concurrencia', () => {
  // Cotización 8: prospecto 1 (Luis Fernando Ixcot), Corolla (vehículo 2), estado Enviada.
  beforeAll(async () => {
    await api(tVendedor).patch('/api/cotizaciones/8/estado').send({ estado: 'Aceptada' }).expect(200);
  });

  test('si falla un paso intermedio se revierte TODO (venta, cliente, prospecto, vehículo, oportunidad, correlativo)', async () => {
    const antes = {
      ventas: await contar('SELECT COUNT(*) n FROM ventas'),
      clientes: await contar('SELECT COUNT(*) n FROM clientes'),
      correlativo: await contar("SELECT COALESCE(MAX(ultimo),0) n FROM correlativos WHERE serie = 'VTA'"),
    };
    // Falla simulada DESPUÉS de crear el cliente y la venta, dentro de la transacción.
    jest
      .spyOn(ventasRepo, 'registrarVehiculosVendidos')
      .mockRejectedValueOnce(new Error('Falla simulada de base de datos'));

    const res = await api(tVendedor)
      .post('/api/ventas')
      .send({ cotizacionId: 8, metodoPago: 'Contado', cliente: { nit: '1234567-8' } });
    expect(res.status).toBe(500);
    expect(res.body.mensaje).not.toMatch(/simulada/); // no se filtran detalles internos

    expect(await contar('SELECT COUNT(*) n FROM ventas')).toBe(antes.ventas);
    expect(await contar('SELECT COUNT(*) n FROM clientes')).toBe(antes.clientes);
    expect(await contar("SELECT COALESCE(MAX(ultimo),0) n FROM correlativos WHERE serie = 'VTA'")).toBe(
      antes.correlativo,
    );
    expect((await api(tVendedor).get('/api/cotizaciones/8')).body.estado).toBe('Aceptada');
    expect((await api(tVendedor).get('/api/vehiculos/2')).body).toMatchObject({
      estado: 'Reservado',
      reservadoCotizacionId: 8,
    });
    expect((await api(tVendedor).get('/api/prospectos/1')).body).toMatchObject({
      estado: 'Calificado',
      clienteId: null,
    });
    expect((await api(tVendedor).get('/api/oportunidades/8')).body.etapa).toBe('Negociación');
  });

  test('dos solicitudes simultáneas: una venta (201) y la otra rechazada (409)', async () => {
    const [a, b] = await Promise.all([
      api(tVendedor)
        .post('/api/ventas')
        .send({ cotizacionId: 8, metodoPago: 'Contado', cliente: { nit: '1234567-8' } }),
      api(tVendedor)
        .post('/api/ventas')
        .send({ cotizacionId: 8, metodoPago: 'Contado', cliente: { nit: '1234567-8' } }),
    ]);
    expect([a.status, b.status].sort()).toEqual([201, 409]);
    expect(await contar('SELECT COUNT(*) n FROM ventas WHERE cotizacion_id = 8')).toBe(1);
  });

  test('el prospecto quedó convertido en cliente y vinculado a la venta', async () => {
    const prospecto = (await api(tVendedor).get('/api/prospectos/1')).body;
    expect(prospecto.estado).toBe('Convertido');
    expect(prospecto.clienteId).toEqual(expect.any(Number));
    const venta = (await api(tVendedor).get('/api/ventas?q=COT-')).body.datos.find(
      (v) => v.cotizacionId === 8,
    );
    expect(venta.clienteId).toBe(prospecto.clienteId);
    const cliente = (await api(tVendedor).get(`/api/clientes/${prospecto.clienteId}`)).body;
    expect(cliente).toMatchObject({
      nombres: 'Luis Fernando',
      nit: '1234567-8',
      prospectoOrigenId: 1,
      compras: 1,
    });
    expect((await api(tVendedor).get('/api/oportunidades/8')).body).toMatchObject({
      etapa: 'Ganado',
      clienteId: prospecto.clienteId,
    });
  });

  test('otra cotización con un vehículo ya vendido no puede aceptarse', async () => {
    // El Corolla (vehículo 2) ya se vendió con la cotización 8.
    const op = await api(tGerente)
      .post('/api/oportunidades')
      .send({ titulo: 'Otro Corolla', clienteId: 2, montoEstimado: 1 });
    const nueva = await api(tGerente)
      .post('/api/cotizaciones')
      .send({ oportunidadId: op.body.id, lineas: [{ vehiculoId: 2 }] });
    expect(nueva.status).toBe(409);
  });
});
