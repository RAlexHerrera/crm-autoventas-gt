/**
 * Prueba de extremo a extremo (E2E) de la interfaz con Playwright.
 * Recorre el flujo comercial completo en un navegador real:
 *   login vendedor → nuevo prospecto → oportunidad → cotización →
 *   enviada → aceptada → venta → login gerente → dashboard actualizado.
 * Guarda capturas de pantalla en ./capturas.
 *
 * Se ejecuta dentro de Docker con:  sh scripts/e2e-docker.sh
 * Requiere el sistema levantado (docker compose up).
 */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const BASE = process.env.BASE_URL || 'http://frontend';
const SALIDA = process.env.CAPTURAS || './capturas';
mkdirSync(SALIDA, { recursive: true });

const sufijo = Date.now().toString().slice(-6);
const prospecto = {
  nombres: 'Brenda Lucía',
  apellidos: `Tuyuc Prueba${sufijo}`,
  telefono: `59${sufijo}`,
  email: `brenda.tuyuc.${sufijo}@correo.gt`,
};

function paso(texto) {
  console.log(`✔ ${texto}`);
}

async function confirmar(page) {
  // El botón principal (confirmar) es siempre el último del diálogo.
  await page.getByRole('alertdialog').locator('button').last().click();
}

async function login(page, email, password) {
  await page.goto(`${BASE}/login`);
  await page.getByLabel('Correo electrónico').fill(email);
  await page.locator('#password').fill(password);
  await page.getByRole('button', { name: 'Ingresar' }).click();
  await page.waitForURL(/\/inicio/);
  await page.getByRole('heading', { name: /Hola,/ }).waitFor();
}

async function totalVentasDashboard(page) {
  const kpi = page.locator('.kpi', { hasText: 'Ventas del período' });
  await kpi.waitFor();
  const detalle = await kpi.locator('.detalle').innerText();
  return Number(detalle.match(/(\d+) ventas/)[1]);
}

const navegador = await chromium.launch();
const contexto = await navegador.newContext({ viewport: { width: 1366, height: 900 }, locale: 'es-GT' });
const page = await contexto.newPage();
page.on('pageerror', (e) => console.error('Error de JavaScript en la página:', e.message));

try {
  // 0. Ventas iniciales vistas por el gerente
  await login(page, 'gerente@autoventas.gt', 'Gerente123!');
  const ventasAntes = await totalVentasDashboard(page);
  paso(`Gerente ve ${ventasAntes} ventas en el dashboard`);
  await page.getByRole('button', { name: 'Salir' }).click();
  await confirmar(page);
  await page.waitForURL(/\/login/);

  // 1. Login como vendedor
  await login(page, 'vendedor@autoventas.gt', 'Vendedor123!');
  await page.screenshot({ path: `${SALIDA}/01-inicio-vendedor.png`, fullPage: true });
  paso('Vendedor inició sesión');

  // El vendedor no ve el menú de reportes ni usuarios
  if (await page.getByRole('link', { name: /Reportes/ }).count())
    throw new Error('El vendedor no debería ver Reportes');
  await page.goto(`${BASE}/reportes`);
  await page.waitForURL(/\/inicio/);
  paso('Vendedor redirigido al intentar abrir /reportes (guard)');

  // 2. Prospecto: primero un duplicado (teléfono de un cliente existente)
  await page.goto(`${BASE}/prospectos/nuevo`);
  await page.getByLabel('Teléfono').fill('5501-1001');
  await page.getByText('Posible duplicado').waitFor();
  await page.screenshot({ path: `${SALIDA}/02-prospecto-duplicado.png`, fullPage: true });
  paso('Detección de duplicado en vivo');

  await page.getByLabel('Nombres').fill(prospecto.nombres);
  await page.getByLabel('Apellidos').fill(prospecto.apellidos);
  await page.getByLabel('Teléfono').fill(prospecto.telefono);
  await page.getByLabel('Correo electrónico').fill(prospecto.email);
  await page.getByLabel('¿Cómo nos conoció?').selectOption('Sitio web');
  await page.getByLabel('Interés').fill('SUV familiar');
  await page.waitForTimeout(800); // espera la verificación de duplicados
  await page.getByRole('button', { name: 'Guardar prospecto' }).click();
  await page.waitForURL(/\/prospectos\/\d+$/);
  paso('Prospecto creado');

  // 3. Oportunidad
  await page.getByRole('link', { name: '+ Nueva oportunidad' }).click();
  await page.waitForURL(/\/oportunidades\/nueva/);
  await page.getByLabel('Título').fill('Vehículo familiar para Brenda');
  // Primer vehículo disponible del catálogo (la prueba se puede repetir sobre la misma base).
  const vehiculo = page.getByLabel('Vehículo de interés');
  await vehiculo.locator('option').nth(1).waitFor({ state: 'attached' });
  await vehiculo.selectOption({ index: 1 });
  await page.getByRole('button', { name: 'Guardar oportunidad' }).click();
  await page.waitForURL(/\/oportunidades\/\d+$/);
  paso('Oportunidad creada');

  // 4. Cotización (el vehículo de interés se propone automáticamente)
  await page.getByRole('link', { name: '+ Nueva cotización' }).click();
  await page.waitForURL(/\/cotizaciones\/nueva/);
  await page.locator('tr.total').waitFor();
  const precioTexto = await page.locator('tbody td.numero').first().innerText();
  const precio = Number(precioTexto.replace(/[^0-9.]/g, ''));
  await page.getByLabel(/Descuento para/).fill('4000');
  await page.screenshot({ path: `${SALIDA}/03-cotizacion-form.png`, fullPage: true });
  await page.getByRole('button', { name: 'Guardar como borrador' }).click();
  await page.waitForURL(/\/cotizaciones\/\d+$/);
  const totalTexto = await page.locator('tr.total td.numero').last().innerText();
  // Total esperado = (precio − Q4,000) × 1.12, calculado aquí de forma independiente.
  const esperado = Math.round((precio - 4000) * 1.12 * 100) / 100;
  const textoEsperado = `Q${esperado.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
  if (!totalTexto.includes(textoEsperado))
    throw new Error(`Total inesperado: ${totalTexto} (esperado ${textoEsperado})`);
  paso(`Cotización creada con total ${totalTexto}`);

  // 5. Enviada → Aceptada → Venta
  await page.getByRole('button', { name: 'Marcar como enviada' }).click();
  await confirmar(page);
  await page.getByRole('button', { name: 'El cliente aceptó' }).click();
  await confirmar(page);
  await page.getByText('los vehículos están reservados').waitFor();
  paso('Cotización enviada y aceptada (vehículo reservado)');
  await page.getByRole('button', { name: /Registrar venta/ }).click();
  await page.getByLabel('NIT del nuevo cliente').fill('7654321-0');
  await page.screenshot({ path: `${SALIDA}/04-registrar-venta.png`, fullPage: true });
  await page.getByRole('button', { name: 'Confirmar venta' }).click();
  await page.waitForURL(/\/ventas\/\d+$/);
  await page.screenshot({ path: `${SALIDA}/05-venta.png`, fullPage: true });
  paso('Venta registrada');

  // 6. El prospecto quedó convertido en cliente
  await page.getByRole('link', { name: new RegExp(prospecto.apellidos) }).click();
  await page.waitForURL(/\/clientes\/\d+$/);
  await page.getByText('Convertido desde el prospecto').waitFor();
  paso('Prospecto convertido en cliente');

  // 7. Dashboard del gerente actualizado
  await page.getByRole('button', { name: 'Salir' }).click();
  await confirmar(page);
  await login(page, 'gerente@autoventas.gt', 'Gerente123!');
  const ventasDespues = await totalVentasDashboard(page);
  if (ventasDespues !== ventasAntes + 1)
    throw new Error(`El dashboard no se actualizó: ${ventasAntes} → ${ventasDespues}`);
  await page.waitForTimeout(800); // animación de gráficas
  await page.screenshot({ path: `${SALIDA}/06-dashboard-gerente.png`, fullPage: true });
  paso(`Dashboard del gerente actualizado: ${ventasAntes} → ${ventasDespues} ventas`);

  // 8. Vista en celular
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${BASE}/cotizaciones`);
  await page.getByRole('heading', { name: 'Cotizaciones' }).waitFor();
  await page.screenshot({ path: `${SALIDA}/07-movil-cotizaciones.png`, fullPage: true });
  await page.getByRole('button', { name: 'Abrir menú' }).click();
  await page.waitForTimeout(400); // transición de apertura del menú
  const menuVisible = await page.getByRole('link', { name: /Prospectos/ }).isVisible();
  const caja = await page.locator('aside.lateral').boundingBox();
  if (!menuVisible || !caja || caja.x < 0) throw new Error('El menú lateral no se muestra en celular');
  await page.screenshot({ path: `${SALIDA}/08-movil-menu.png` });
  paso('Vista responsive en celular');

  console.log('\nFLUJO E2E COMPLETO: OK');
} catch (error) {
  await page.screenshot({ path: `${SALIDA}/error.png`, fullPage: true });
  console.error('\nFLUJO E2E FALLÓ:', error.message);
  process.exitCode = 1;
} finally {
  await navegador.close();
}
