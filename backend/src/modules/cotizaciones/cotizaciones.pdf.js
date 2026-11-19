/**
 * HU-14: exportación de una cotización a PDF con PDFKit.
 * Usa las fuentes estándar (Helvetica, codificación WinAnsi), que incluyen
 * los caracteres del español (á, é, í, ó, ú, ñ, ¿, ¡).
 */
const PDFDocument = require('pdfkit');

const AZUL = '#1d4ed8';
const GRIS = '#5b6474';
const formatoNumero = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const q = (n) => `Q${formatoNumero.format(Number(n) || 0)}`;
const fecha = (f) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(f || '');
  return m ? `${m[3]}/${m[2]}/${m[1]}` : '—';
};

/**
 * Escribe el PDF de la cotización en el stream indicado (p. ej. la respuesta HTTP).
 * @param {object} cot cotización con `lineas` (resultado de cotizaciones.service.obtener)
 * @param {import('stream').Writable} destino
 */
function generarPdfCotizacion(cot, destino) {
  const doc = new PDFDocument({
    size: 'LETTER',
    margin: 50,
    info: {
      Title: `Cotización ${cot.correlativo}`,
      Author: 'AutoVentas GT, S.A.',
      Subject: 'Cotización de vehículos',
    },
  });
  doc.pipe(destino);
  const ancho = doc.page.width - 100;

  // Encabezado
  doc.rect(0, 0, doc.page.width, 90).fill(AZUL);
  doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(20).text('AutoVentas GT, S.A.', 50, 28);
  doc.font('Helvetica').fontSize(10).text('Venta de vehículos nuevos y usados · Guatemala', 50, 54);
  doc.font('Helvetica-Bold').fontSize(14).text('COTIZACIÓN', 50, 28, { width: ancho, align: 'right' });
  doc.font('Helvetica').fontSize(11).text(cot.correlativo, 50, 50, { width: ancho, align: 'right' });

  // Datos generales
  doc.fillColor('#1f2937').fontSize(10);
  let y = 110;
  const fila = (etiqueta, valor, x, yy) => {
    doc.font('Helvetica-Bold').fillColor(GRIS).text(etiqueta, x, yy);
    doc
      .font('Helvetica')
      .fillColor('#1f2937')
      .text(valor || '—', x + 90, yy, { width: 160 });
  };
  fila(cot.contactoTipo === 'Cliente' ? 'Cliente:' : 'Prospecto:', cot.contactoNombre, 50, y);
  fila('Fecha:', fecha(cot.fecha), 320, y);
  y += 18;
  fila('Teléfono:', cot.contactoTelefono, 50, y);
  fila('Vigente hasta:', fecha(cot.vigenciaHasta), 320, y);
  y += 18;
  fila('Correo:', cot.contactoEmail, 50, y);
  fila('Estado:', cot.estado, 320, y);
  y += 18;
  fila('NIT:', cot.contactoNit || 'CF', 50, y);
  fila('Vendedor:', cot.vendedorNombre, 320, y);
  y += 32;

  // Tabla de vehículos
  const columnas = [
    { titulo: 'Vehículo', x: 50, ancho: 200, alinear: 'left' },
    { titulo: 'VIN', x: 250, ancho: 110, alinear: 'left' },
    { titulo: 'Precio', x: 360, ancho: 70, alinear: 'right' },
    { titulo: 'Descuento', x: 430, ancho: 60, alinear: 'right' },
    { titulo: 'Subtotal', x: 490, ancho: 72, alinear: 'right' },
  ];
  doc.rect(50, y, ancho, 20).fill('#eef2ff');
  doc.fillColor(AZUL).font('Helvetica-Bold').fontSize(9);
  columnas.forEach((c) => doc.text(c.titulo, c.x + 4, y + 6, { width: c.ancho - 8, align: c.alinear }));
  y += 24;

  doc.font('Helvetica').fillColor('#1f2937').fontSize(9);
  for (const l of cot.lineas) {
    const descripcion = `${l.marca} ${l.modelo} ${l.anio}${l.version ? ` ${l.version}` : ''}\n${l.color} · ${l.condicion} · ${l.transmision} · ${l.combustible}`;
    const alto = Math.max(doc.heightOfString(descripcion, { width: 192 }), 12) + 8;
    if (y + alto > doc.page.height - 200) {
      doc.addPage();
      y = 50;
    }
    doc.text(descripcion, 54, y, { width: 192 });
    doc.font('Courier').text(l.vin, 254, y, { width: 102 });
    doc.font('Helvetica');
    doc.text(q(l.precioUnitario), 364, y, { width: 62, align: 'right' });
    doc.text(q(l.descuento), 434, y, { width: 52, align: 'right' });
    doc.text(q(l.subtotal), 494, y, { width: 64, align: 'right' });
    y += alto;
    doc
      .moveTo(50, y - 3)
      .lineTo(50 + ancho, y - 3)
      .strokeColor('#dfe3ea')
      .lineWidth(0.5)
      .stroke();
  }

  // Totales
  y += 10;
  const totales = [
    ['Subtotal', q(cot.subtotal)],
    ['(-) Descuentos', q(cot.descuento)],
    ['Base imponible', q(cot.baseImponible)],
    [`IVA ${Math.round(cot.ivaTasa * 100)} %`, q(cot.iva)],
  ];
  doc.fontSize(10);
  for (const [etiqueta, valor] of totales) {
    doc.font('Helvetica').fillColor(GRIS).text(etiqueta, 350, y, { width: 120, align: 'right' });
    doc.fillColor('#1f2937').text(valor, 470, y, { width: 92, align: 'right' });
    y += 16;
  }
  doc.rect(350, y, 212, 24).fill(AZUL);
  doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(12);
  doc.text('TOTAL', 356, y + 7, { width: 110, align: 'right' });
  doc.text(q(cot.total), 470, y + 7, { width: 88, align: 'right' });
  y += 40;

  // Observaciones y condiciones
  doc.fillColor('#1f2937').fontSize(9);
  if (cot.observaciones) {
    doc.font('Helvetica-Bold').text('Observaciones:', 50, y);
    doc.font('Helvetica').text(cot.observaciones, 50, y + 13, { width: ancho });
    y = doc.y + 12;
  }
  doc.font('Helvetica-Bold').text('Condiciones:', 50, y);
  doc
    .font('Helvetica')
    .fillColor(GRIS)
    .list(
      [
        'Precios en quetzales. El IVA (12 %) se calcula sobre el precio menos el descuento.',
        `Oferta válida hasta el ${fecha(cot.vigenciaHasta)} o hasta agotar existencias.`,
        'Los vehículos se reservan al aceptar la cotización y se entregan al completar el pago.',
        'Documento informativo; no constituye factura.',
      ],
      58,
      y + 14,
      { width: ancho - 10, bulletRadius: 1.5 },
    );

  // Pie de página: se anula el margen inferior para que PDFKit no agregue otra página.
  doc.page.margins.bottom = 0;
  doc
    .fontSize(8)
    .fillColor(GRIS)
    .text(`Generado por el CRM AutoVentas GT · ${cot.correlativo}`, 50, doc.page.height - 40, {
      width: ancho,
      align: 'center',
      lineBreak: false,
    });
  doc.end();
}

module.exports = { generarPdfCotizacion };
