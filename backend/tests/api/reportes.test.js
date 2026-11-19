/** HU-11, HU-12, HU-13, HU-15: reportes y dashboard (datos y permisos). */
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

describe('Dashboard del gerente', () => {
  test('KPI coherentes con los datos de ejemplo', async () => {
    const res = await api(tGerente).get('/api/reportes/dashboard');
    expect(res.status).toBe(200);
    expect(res.body.kpis).toMatchObject({ ventasCantidad: 6, ventasMonto: 1478400, unidadesVendidas: 6 });
    expect(res.body.kpis.ticketPromedio).toBeCloseTo(246400, 2);
    expect(res.body.ventasPorMes).toHaveLength(12);
    expect(res.body.ventasPorMes.reduce((a, m) => a + m.cantidad, 0)).toBe(6);
    expect(res.body.funnel.etapas.map((e) => e.etapa)).toContain('Negociación');
    expect(res.body.topVehiculos.length).toBeGreaterThan(0);
    expect(res.body.vendedores.length).toBe(3);
  });

  test('filtro por rango de fechas', async () => {
    const hoy = new Date(Date.now() - 6 * 3600 * 1000);
    const hace30 = new Date(hoy.getTime() - 30 * 86400000).toISOString().slice(0, 10);
    const res = await api(tGerente).get(
      `/api/reportes/ventas-periodo?desde=${hace30}&hasta=${hoy.toISOString().slice(0, 10)}`,
    );
    // Ventas de hace 20 y 8 días.
    expect(res.body.totales.cantidad).toBe(2);
  });

  test('rango inválido (desde > hasta) → 400', async () => {
    const res = await api(tGerente).get('/api/reportes/funnel?desde=2026-12-31&hasta=2026-01-01');
    expect(res.status).toBe(400);
  });
});

describe('Reportes específicos', () => {
  test('rendimiento por vendedor (HU-12)', async () => {
    const res = await api(tGerente).get('/api/reportes/rendimiento-vendedores');
    const carlos = res.body.vendedores.find((v) => v.vendedorId === 3);
    expect(carlos).toMatchObject({ ventas: 3, monto: 711200 });
  });

  test('conversión de prospectos por fuente (HU-13)', async () => {
    const res = await api(tGerente).get('/api/reportes/conversion-prospectos');
    expect(res.body.total).toBe(12);
    expect(res.body.convertidos).toBe(1);
    expect(res.body.porFuente.find((f) => f.fuente === 'Sitio web').convertidos).toBe(1);
  });

  test('vehículos más vendidos', async () => {
    const res = await api(tGerente).get('/api/reportes/vehiculos-mas-vendidos?limite=3');
    expect(res.body.vehiculos).toHaveLength(3);
  });

  test('clasificación de clientes con sugerencias (HU-15)', async () => {
    const res = await api(tGerente).get('/api/reportes/clasificacion-clientes');
    const frecuente = res.body.resumen.find((r) => r.clasificacion === 'Frecuente');
    expect(frecuente.clientes).toBe(1);
    const jorge = res.body.clientes.find((c) => c.id === 1);
    expect(jorge).toMatchObject({ compras: 2, sugerida: 'VIP' }); // Q520,800 ≥ Q500,000
  });
});

describe('Panel personal del vendedor', () => {
  test('solo incluye sus propias ventas', async () => {
    const res = await api(tVendedor).get('/api/reportes/mi-panel');
    expect(res.status).toBe(200);
    expect(res.body.kpis).toMatchObject({ ventasCantidad: 3, ventasMonto: 711200 });
  });
});
