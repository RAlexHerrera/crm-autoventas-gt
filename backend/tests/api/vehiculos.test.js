/** HU-07 / HU-08: catálogo de vehículos, VIN único, filtros y disponibilidad. */
const { prepararBd } = require('../helpers/bd');
const { token, api } = require('../helpers/api');
const { pool } = require('../../src/db/pool');

let tGerente;
let tVendedor;

const nuevo = (extra = {}) => ({
  vin: '1HGCM82633A004352',
  marca: 'Honda',
  modelo: 'Accord',
  anio: 2026,
  version: 'EX-L',
  tipo: 'Sedán',
  condicion: 'Nuevo',
  color: 'Plata',
  transmision: 'Automática',
  combustible: 'Gasolina',
  motor: '1.5 L turbo',
  kilometraje: 0,
  precio: 265000,
  ...extra,
});

beforeAll(async () => {
  await prepararBd();
  [tGerente, tVendedor] = await Promise.all([token('gerente'), token('vendedor')]);
});
afterAll(() => pool.end());

describe('Registro de vehículos', () => {
  test('el gerente registra un vehículo; el VIN se normaliza a mayúsculas', async () => {
    const res = await api(tGerente)
      .post('/api/vehiculos')
      .send(nuevo({ vin: '1hgcm82633a004352' }));
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      vin: '1HGCM82633A004352',
      estado: 'Disponible',
      vinDigitoVerificadorValido: true,
    });
  });

  test('VIN duplicado → 409 (restricción UNIQUE)', async () => {
    const res = await api(tGerente)
      .post('/api/vehiculos')
      .send(nuevo({ modelo: 'Otro' }));
    expect(res.status).toBe(409);
    expect(res.body.mensaje).toMatch(/VIN/);
  });

  test('VIN duplicado aunque se escriba en minúsculas o con guiones → 409', async () => {
    const res = await api(tGerente)
      .post('/api/vehiculos')
      .send(nuevo({ vin: '1hgcm-82633a-004352' }));
    expect(res.status).toBe(409);
  });

  test.each([
    ['menos de 17 caracteres', 'ABC123'],
    ['con letra O', '1HGCM82633AO04352'],
    ['con letra I', '1HGCM82633AI04352'],
  ])('VIN inválido (%s) → 400', async (_caso, vin) => {
    const res = await api(tGerente).post('/api/vehiculos').send(nuevo({ vin }));
    expect(res.status).toBe(400);
    expect(res.body.errores[0].campo).toBe('vin');
  });

  test('precio cero o negativo → 400', async () => {
    const res = await api(tGerente)
      .post('/api/vehiculos')
      .send(nuevo({ vin: '2T1BURHE0JC123456', precio: 0 }));
    expect(res.status).toBe(400);
  });

  test('vehículo "Nuevo" con mucho kilometraje → 400', async () => {
    const res = await api(tGerente)
      .post('/api/vehiculos')
      .send(nuevo({ vin: '2T1BURHE0JC123456', kilometraje: 15000 }));
    expect(res.status).toBe(400);
  });

  test('el vendedor no puede registrar vehículos → 403', async () => {
    const res = await api(tVendedor)
      .post('/api/vehiculos')
      .send(nuevo({ vin: '2T1BURHE0JC123456' }));
    expect(res.status).toBe(403);
  });
});

describe('Consulta y filtros', () => {
  test('filtra por estado, marca y rango de precio', async () => {
    const res = await api(tVendedor).get('/api/vehiculos?estado=Disponible&marca=Toyota&precioMax=250000');
    expect(res.status).toBe(200);
    expect(res.body.datos.length).toBeGreaterThan(0);
    for (const v of res.body.datos) {
      expect(v.estado).toBe('Disponible');
      expect(v.marca).toBe('Toyota');
      expect(v.precio).toBeLessThanOrEqual(250000);
    }
  });

  test('búsqueda por VIN parcial', async () => {
    const res = await api(tVendedor).get('/api/vehiculos?q=JTFHK3FB');
    expect(res.body.total).toBe(1);
    expect(res.body.datos[0].modelo).toBe('Hilux');
  });

  test('paginación', async () => {
    const res = await api(tVendedor).get('/api/vehiculos?tamano=5&pagina=2');
    expect(res.body.datos).toHaveLength(5);
    expect(res.body.pagina).toBe(2);
  });

  test('resumen de inventario por estado', async () => {
    const res = await api(tVendedor).get('/api/vehiculos/inventario');
    const vendidos = res.body.porEstado.find((e) => e.estado === 'Vendido');
    expect(vendidos.cantidad).toBe(6);
  });
});

describe('Disponibilidad', () => {
  test('no se puede marcar como Vendido manualmente', async () => {
    const res = await api(tGerente).patch('/api/vehiculos/2/estado').send({ estado: 'Vendido' });
    expect(res.status).toBe(400);
  });

  test('un vehículo vendido no se puede editar ni cambiar de estado', async () => {
    expect((await api(tGerente).patch('/api/vehiculos/1/estado').send({ estado: 'Disponible' })).status).toBe(
      409,
    );
    const v = (await api(tGerente).get('/api/vehiculos/1')).body;
    const res = await api(tGerente)
      .put('/api/vehiculos/1')
      .send({ ...nuevo(), vin: v.vin, precio: 1 });
    expect(res.status).toBe(409);
  });

  test('un vehículo reservado por cotización aceptada no se libera manualmente', async () => {
    const res = await api(tGerente).patch('/api/vehiculos/3/estado').send({ estado: 'Disponible' });
    expect(res.status).toBe(409);
  });

  test('reserva y liberación manual de un vehículo disponible', async () => {
    expect(
      (await api(tGerente).patch('/api/vehiculos/14/estado').send({ estado: 'Reservado' })).body.estado,
    ).toBe('Reservado');
    expect(
      (await api(tGerente).patch('/api/vehiculos/14/estado').send({ estado: 'Disponible' })).body.estado,
    ).toBe('Disponible');
  });
});
