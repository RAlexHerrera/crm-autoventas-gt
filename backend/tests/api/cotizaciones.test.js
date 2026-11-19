/**
 * HU-09: cotizaciones — correlativo único, cálculo de subtotal, descuentos,
 * IVA 12 % y total, rechazo de vehículos no disponibles y estados.
 */
const { prepararBd } = require('../helpers/bd');
const { token, api } = require('../helpers/api');
const { pool } = require('../../src/db/pool');

let tGerente;
let tVendedor;

beforeAll(async () => {
  await prepararBd();
  [tGerente, tVendedor] = await Promise.all([token('gerente'), token('vendedor')]);
});
afterAll(() => pool.end());

const anio = new Date(Date.now() - 6 * 3600 * 1000).getUTCFullYear();

describe('Creación y cálculos', () => {
  test('cotización con descuento: totales calculados por el servidor (IVA 12 %)', async () => {
    // Oportunidad 12 (vendedor 3, Prospección). Vehículo 14: Suzuki Swift Q129,900.
    const res = await api(tVendedor)
      .post('/api/cotizaciones')
      .send({ oportunidadId: 12, lineas: [{ vehiculoId: 14, descuento: 2400.5 }] });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      estado: 'Borrador',
      subtotal: 129900,
      descuento: 2400.5,
      baseImponible: 127499.5,
      ivaTasa: 0.12,
      iva: 15299.94, // 127,499.50 × 0.12 = 15,299.94
      total: 142799.44,
      vendedorId: 3,
    });
    expect(res.body.correlativo).toMatch(new RegExp(`^COT-${anio}-\\d{6}$`));
    expect(res.body.lineas[0]).toMatchObject({ vehiculoId: 14, precioUnitario: 129900, subtotal: 127499.5 });
  });

  test('el precio lo toma el servidor del catálogo (se ignora un precio enviado por el cliente)', async () => {
    const res = await api(tVendedor)
      .post('/api/cotizaciones')
      .send({ oportunidadId: 12, lineas: [{ vehiculoId: 5, precio: 1, descuento: 0 }] });
    expect(res.status).toBe(201);
    expect(res.body.subtotal).toBe(168000);
  });

  test('la oportunidad avanza automáticamente a la etapa "Cotización"', async () => {
    const op = await api(tVendedor).get('/api/oportunidades/12');
    expect(op.body.etapa).toBe('Cotización');
    expect(op.body.cotizaciones.length).toBe(2);
  });

  test('varios vehículos en una misma cotización', async () => {
    const res = await api(tGerente)
      .post('/api/cotizaciones')
      .send({ oportunidadId: 10, lineas: [{ vehiculoId: 8, descuento: 4000 }, { vehiculoId: 15 }] });
    expect(res.status).toBe(201);
    expect(res.body.subtotal).toBe(259000 + 279000);
    expect(res.body.total).toBe(Math.round((538000 - 4000) * 1.12 * 100) / 100);
    expect(res.body.vendedorId).toBe(4); // queda a nombre del vendedor de la oportunidad
  });
});

describe('Validaciones', () => {
  test.each([
    ['vendido', 1, 'vendido'],
    ['reservado', 3, 'reservado'],
  ])('rechaza vehículo %s → 409', async (_caso, vehiculoId, texto) => {
    const res = await api(tGerente)
      .post('/api/cotizaciones')
      .send({ oportunidadId: 10, lineas: [{ vehiculoId }] });
    expect(res.status).toBe(409);
    expect(res.body.mensaje).toMatch(texto);
    expect(res.body.vehiculosNoDisponibles[0].id).toBe(vehiculoId);
  });

  test('descuento mayor al precio → 400', async () => {
    const res = await api(tGerente)
      .post('/api/cotizaciones')
      .send({ oportunidadId: 10, lineas: [{ vehiculoId: 8, descuento: 999999 }] });
    expect(res.status).toBe(400);
  });

  test('vehículo repetido, sin líneas o descuento negativo → 400', async () => {
    const base = { oportunidadId: 10 };
    expect(
      (
        await api(tGerente)
          .post('/api/cotizaciones')
          .send({ ...base, lineas: [] })
      ).status,
    ).toBe(400);
    expect(
      (
        await api(tGerente)
          .post('/api/cotizaciones')
          .send({ ...base, lineas: [{ vehiculoId: 8 }, { vehiculoId: 8 }] })
      ).status,
    ).toBe(400);
    expect(
      (
        await api(tGerente)
          .post('/api/cotizaciones')
          .send({ ...base, lineas: [{ vehiculoId: 8, descuento: -5 }] })
      ).status,
    ).toBe(400);
  });

  test('no se cotiza sobre una oportunidad cerrada ni ajena', async () => {
    expect(
      (
        await api(tGerente)
          .post('/api/cotizaciones')
          .send({ oportunidadId: 1, lineas: [{ vehiculoId: 8 }] })
      ).status,
    ).toBe(409);
    // La oportunidad 10 es de la vendedora 2.
    expect(
      (
        await api(tVendedor)
          .post('/api/cotizaciones')
          .send({ oportunidadId: 10, lineas: [{ vehiculoId: 8 }] })
      ).status,
    ).toBe(404);
  });

  test('vigencia en el pasado → 400', async () => {
    const res = await api(tGerente)
      .post('/api/cotizaciones')
      .send({ oportunidadId: 10, vigenciaHasta: '2020-01-01', lineas: [{ vehiculoId: 8 }] });
    expect(res.status).toBe(400);
  });
});

describe('Correlativo único', () => {
  test('cotizaciones creadas en paralelo reciben correlativos distintos y consecutivos', async () => {
    // Oportunidades y vehículos distintos para que la única contención sea el correlativo.
    const respuestas = await Promise.all(
      Array.from({ length: 6 }, (_x, i) =>
        api(tGerente)
          .post('/api/cotizaciones')
          .send(
            i % 2
              ? { oportunidadId: 13, lineas: [{ vehiculoId: 16 }] }
              : { oportunidadId: 14, lineas: [{ vehiculoId: 6 }] },
          ),
      ),
    );
    respuestas.forEach((r) => expect(r.status).toBe(201));
    const numeros = respuestas.map((r) => Number(r.body.correlativo.slice(-6))).sort((a, b) => a - b);
    expect(new Set(numeros).size).toBe(6);
    expect(numeros[5] - numeros[0]).toBe(5);
  });

  test('la base de datos rechaza un correlativo repetido (UNIQUE)', async () => {
    await expect(
      pool.query(
        `INSERT INTO cotizaciones (correlativo, oportunidad_id, vendedor_id, fecha, vigencia_hasta, subtotal, descuento, base_imponible, iva, total)
         SELECT correlativo, oportunidad_id, vendedor_id, fecha, vigencia_hasta, subtotal, descuento, base_imponible, iva, total
           FROM cotizaciones WHERE id = 1`,
      ),
    ).rejects.toMatchObject({ code: 'ER_DUP_ENTRY' });
  });
});

describe('Estados y seguimiento de ofertas', () => {
  let id;

  beforeAll(async () => {
    const res = await api(tVendedor)
      .post('/api/cotizaciones')
      .send({ oportunidadId: 15, lineas: [{ vehiculoId: 17 }] });
    id = res.body.id;
  });

  test('transición inválida Borrador → Aceptada → 409', async () => {
    expect(
      (await api(tVendedor).patch(`/api/cotizaciones/${id}/estado`).send({ estado: 'Aceptada' })).status,
    ).toBe(409);
  });

  test('Borrador → Enviada → Aceptada reserva el vehículo y pasa la oportunidad a Negociación', async () => {
    await api(tVendedor).patch(`/api/cotizaciones/${id}/estado`).send({ estado: 'Enviada' }).expect(200);
    const res = await api(tVendedor).patch(`/api/cotizaciones/${id}/estado`).send({ estado: 'Aceptada' });
    expect(res.status).toBe(200);
    expect(res.body.estado).toBe('Aceptada');
    expect(res.body.oportunidadEtapa).toBe('Negociación');
    expect((await api(tVendedor).get('/api/vehiculos/17')).body).toMatchObject({
      estado: 'Reservado',
      reservadoCotizacionId: id,
    });
  });

  test('una cotización aceptada no se puede editar ni eliminar', async () => {
    expect(
      (
        await api(tVendedor)
          .put(`/api/cotizaciones/${id}`)
          .send({ oportunidadId: 15, lineas: [{ vehiculoId: 17 }] })
      ).status,
    ).toBe(409);
    expect((await api(tVendedor).delete(`/api/cotizaciones/${id}`)).status).toBe(409);
  });

  test('"Convertida" solo se asigna al registrar la venta', async () => {
    expect(
      (await api(tVendedor).patch(`/api/cotizaciones/${id}/estado`).send({ estado: 'Convertida' })).status,
    ).toBe(400);
  });

  test('rechazar una cotización aceptada libera el vehículo', async () => {
    await api(tVendedor).patch(`/api/cotizaciones/${id}/estado`).send({ estado: 'Rechazada' }).expect(200);
    expect((await api(tVendedor).get('/api/vehiculos/17')).body).toMatchObject({
      estado: 'Disponible',
      reservadoCotizacionId: null,
    });
  });

  test('las cotizaciones con vigencia vencida pasan a "Vencida"', async () => {
    const nueva = await api(tVendedor)
      .post('/api/cotizaciones')
      .send({ oportunidadId: 15, lineas: [{ vehiculoId: 11 }] });
    await pool.query(
      'UPDATE cotizaciones SET fecha = DATE_SUB(CURDATE(), INTERVAL 30 DAY), vigencia_hasta = DATE_SUB(CURDATE(), INTERVAL 1 DAY) WHERE id = ?',
      [nueva.body.id],
    );
    const res = await api(tVendedor).get(`/api/cotizaciones/${nueva.body.id}`);
    expect(res.body.estado).toBe('Vencida');
  });
});

describe('Exportación a PDF (HU-14)', () => {
  const binario = (res, callback) => {
    const partes = [];
    res.on('data', (c) => partes.push(c));
    res.on('end', () => callback(null, Buffer.concat(partes)));
  };

  test('genera un PDF válido de la cotización', async () => {
    const res = await api(tGerente).get('/api/cotizaciones/1/pdf').buffer(true).parse(binario);
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toBe('application/pdf');
    expect(res.headers['content-disposition']).toMatch(/COT-\d{4}-000001\.pdf/);
    expect(res.body.subarray(0, 5).toString()).toBe('%PDF-');
    expect(res.body.length).toBeGreaterThan(1500);
  });

  test('un vendedor no puede descargar la cotización de otro vendedor', async () => {
    expect((await api(tVendedor).get('/api/cotizaciones/2/pdf')).status).toBe(404);
  });
});
