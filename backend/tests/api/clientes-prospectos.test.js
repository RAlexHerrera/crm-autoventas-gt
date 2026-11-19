/**
 * HU-02 / HU-03 (clientes e interacciones) y HU-04 / HU-05 / HU-06
 * (prospectos, duplicados, asignación y etapas de oportunidades).
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

describe('Clientes (HU-02)', () => {
  let id;

  test('registro con validaciones; el vendedor queda como responsable', async () => {
    const res = await api(tVendedor).post('/api/clientes').send({
      nombres: 'Rosa Elena',
      apellidos: 'Cojtí Xoyón',
      dpi: '1234567890101',
      nit: '9876543-2',
      telefono: '5544-3322',
      email: 'Rosa.Cojti@Correo.gt',
    });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ vendedorId: 3, clasificacion: 'Nuevo', email: 'rosa.cojti@correo.gt' });
    id = res.body.id;
  });

  test('DPI con formato inválido → 400; DPI duplicado → 409', async () => {
    const malo = await api(tVendedor)
      .post('/api/clientes')
      .send({ nombres: 'Xx', apellidos: 'Yy', telefono: '5544-0000', dpi: '123' });
    expect(malo.status).toBe(400);
    const dup = await api(tVendedor)
      .post('/api/clientes')
      .send({ nombres: 'Xx', apellidos: 'Yy', telefono: '5544-0000', dpi: '1234567890101' });
    expect(dup.status).toBe(409);
    expect(dup.body.mensaje).toMatch(/DPI/);
  });

  test('edición y clasificación (HU-15)', async () => {
    const res = await api(tVendedor).put(`/api/clientes/${id}`).send({
      nombres: 'Rosa Elena',
      apellidos: 'Cojtí Xoyón',
      telefono: '5544-3322',
      clasificacion: 'VIP',
    });
    expect(res.status).toBe(200);
    expect(res.body.clasificacion).toBe('VIP');
  });

  test('búsqueda por nombre', async () => {
    const res = await api(tVendedor).get('/api/clientes?q=Cojt');
    expect(res.body.datos.map((c) => c.id)).toContain(id);
  });
});

describe('Historial de interacciones (HU-03)', () => {
  test('registra y lista interacciones en orden cronológico inverso', async () => {
    await api(tVendedor)
      .post('/api/interacciones')
      .send({ clienteId: 1, tipo: 'Llamada', descripcion: 'Seguimiento posventa', fecha: '2026-01-10 09:00' })
      .expect(201);
    const res = await api(tVendedor).get('/api/interacciones?clienteId=1');
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(1);
    const fechas = res.body.map((i) => i.fecha);
    expect([...fechas].sort().reverse()).toEqual(fechas);
  });

  test('tipo "Sistema" no se puede registrar manualmente; destino obligatorio', async () => {
    expect(
      (
        await api(tVendedor)
          .post('/api/interacciones')
          .send({ clienteId: 1, tipo: 'Sistema', descripcion: 'x x x' })
      ).status,
    ).toBe(400);
    expect(
      (await api(tVendedor).post('/api/interacciones').send({ tipo: 'Nota', descripcion: 'sin destino' }))
        .status,
    ).toBe(400);
  });

  test('no se puede registrar interacción sobre un cliente ajeno', async () => {
    const res = await api(tVendedor)
      .post('/api/interacciones')
      .send({ clienteId: 2, tipo: 'Nota', descripcion: 'ajeno' });
    expect(res.status).toBe(404);
  });
});

describe('Prospectos (HU-04 / HU-05)', () => {
  let prospectoId;

  test('registro de lead', async () => {
    const res = await api(tVendedor).post('/api/prospectos').send({
      nombres: 'Mynor',
      apellidos: 'Saquic',
      telefono: '4888-7766',
      email: 'mynor.saquic@correo.gt',
      fuente: 'Feria',
      interes: 'Pickup',
    });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ estado: 'Nuevo', vendedorId: 3 });
    prospectoId = res.body.id;
  });

  test('detecta duplicado por teléfono aunque tenga otro formato → 409 con coincidencias', async () => {
    const res = await api(tVendedor)
      .post('/api/prospectos')
      .send({ nombres: 'Otro', apellidos: 'Nombre', telefono: '(4888) 7766', fuente: 'Llamada' });
    expect(res.status).toBe(409);
    expect(res.body.duplicados[0]).toMatchObject({
      tipo: 'prospecto',
      id: prospectoId,
      coincidencia: 'teléfono',
    });
  });

  test('detecta duplicado por correo contra clientes existentes', async () => {
    const res = await api(tVendedor).post('/api/prospectos').send({
      nombres: 'Jorge',
      apellidos: 'Duplicado',
      telefono: '4000-0000',
      email: 'JORGE.RODRIGUEZ@correo.gt',
      fuente: 'Llamada',
    });
    expect(res.status).toBe(409);
    expect(res.body.duplicados[0]).toMatchObject({ tipo: 'cliente', coincidencia: 'correo' });
  });

  test('a un vendedor no se le muestran datos de contacto de duplicados ajenos', async () => {
    // Prospecto 4 pertenece a la vendedora 2.
    const res = await api(tVendedor).get('/api/prospectos/verificar-duplicados?telefono=3045-6404');
    expect(res.body.duplicados[0]).toMatchObject({ id: 4, email: null, telefono: null });
  });

  test('asignación de vendedor por el gerente (HU-05) con registro en el historial', async () => {
    const res = await api(tGerente).patch(`/api/prospectos/${prospectoId}/asignar`).send({ vendedorId: 4 });
    expect(res.status).toBe(200);
    expect(res.body.vendedorId).toBe(4);
    const hist = await api(tGerente).get(`/api/interacciones?prospectoId=${prospectoId}`);
    expect(hist.body[0].descripcion).toMatch(/reasignado/);
    // El vendedor original ya no lo ve.
    expect((await api(tVendedor).get(`/api/prospectos/${prospectoId}`)).status).toBe(404);
  });

  test('no se puede asignar a un usuario que no es vendedor', async () => {
    const res = await api(tGerente).patch(`/api/prospectos/${prospectoId}/asignar`).send({ vendedorId: 2 });
    expect(res.status).toBe(400);
  });

  test('conversión manual de prospecto en cliente', async () => {
    const res = await api(tVendedor).post('/api/prospectos/9/convertir').send({ nit: 'CF' });
    expect(res.status).toBe(201);
    expect(res.body.prospecto).toMatchObject({ estado: 'Convertido', clienteId: res.body.clienteId });
    const cliente = await api(tVendedor).get(`/api/clientes/${res.body.clienteId}`);
    expect(cliente.body).toMatchObject({ nombres: 'Oscar René', prospectoOrigenId: 9 });
    expect((await api(tVendedor).post('/api/prospectos/9/convertir').send({})).status).toBe(409);
  });
});

describe('Oportunidades y embudo (HU-06)', () => {
  let opId;

  test('crear oportunidad para un prospecto propio', async () => {
    const res = await api(tVendedor)
      .post('/api/oportunidades')
      .send({ titulo: 'Swift o Picanto', prospectoId: 2, vehiculoInteresId: 14, montoEstimado: 129900 });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ etapa: 'Prospección', vendedorId: 3, contactoTipo: 'Prospecto' });
    opId = res.body.id;
  });

  test('avance de etapa con registro automático en el historial', async () => {
    const res = await api(tVendedor).patch(`/api/oportunidades/${opId}/etapa`).send({ etapa: 'Contacto' });
    expect(res.body.etapa).toBe('Contacto');
    const hist = await api(tVendedor).get(`/api/interacciones?oportunidadId=${opId}`);
    expect(hist.body[0]).toMatchObject({ tipo: 'Sistema' });
    expect(hist.body[0].descripcion).toMatch(/Prospección.*Contacto/);
  });

  test('"Ganado" no se asigna manualmente; "Perdido" exige motivo', async () => {
    expect(
      (await api(tVendedor).patch(`/api/oportunidades/${opId}/etapa`).send({ etapa: 'Ganado' })).status,
    ).toBe(400);
    expect(
      (await api(tVendedor).patch(`/api/oportunidades/${opId}/etapa`).send({ etapa: 'Perdido' })).status,
    ).toBe(400);
  });

  test('al perder la oportunidad se rechazan sus cotizaciones y se liberan reservas', async () => {
    // Oportunidad 7 (vendedor 3) tiene la cotización 7 aceptada con la RAV4 (id 3) reservada.
    const res = await api(tVendedor)
      .patch('/api/oportunidades/7/etapa')
      .send({ etapa: 'Perdido', motivoPerdida: 'El cliente pospuso la compra' });
    expect(res.status).toBe(200);
    expect((await api(tVendedor).get('/api/cotizaciones/7')).body.estado).toBe('Rechazada');
    expect((await api(tVendedor).get('/api/vehiculos/3')).body).toMatchObject({
      estado: 'Disponible',
      reservadoCotizacionId: null,
    });
    // Una oportunidad cerrada ya no cambia de etapa.
    expect(
      (await api(tVendedor).patch('/api/oportunidades/7/etapa').send({ etapa: 'Contacto' })).status,
    ).toBe(409);
  });

  test('resumen por etapas filtrado al vendedor', async () => {
    const res = await api(tVendedor).get('/api/oportunidades/resumen-etapas');
    expect(res.body.map((e) => e.etapa)).toEqual([
      'Prospección',
      'Contacto',
      'Cotización',
      'Negociación',
      'Ganado',
      'Perdido',
    ]);
  });
});
