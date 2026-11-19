/**
 * Vista previa de los totales de una cotización (misma regla que el backend,
 * que es quien calcula los valores definitivos): se trabaja en centavos.
 *   base = subtotal − descuento; IVA = base × 12 %; total = base + IVA.
 */
export interface TotalesCotizacion {
  subtotal: number;
  descuento: number;
  baseImponible: number;
  iva: number;
  total: number;
}

export const IVA_TASA = 0.12;

export function calcularTotales(
  lineas: { precio: number; descuento: number }[],
  tasa = IVA_TASA,
): TotalesCotizacion {
  const c = (n: number) => Math.round((Number(n) || 0) * 100);
  const subtotalC = lineas.reduce((a, l) => a + c(l.precio), 0);
  const descuentoC = lineas.reduce((a, l) => a + Math.min(c(l.descuento), c(l.precio)), 0);
  const baseC = subtotalC - descuentoC;
  const ivaC = Math.round((baseC * Math.round(tasa * 10000)) / 10000);
  return {
    subtotal: subtotalC / 100,
    descuento: descuentoC / 100,
    baseImponible: baseC / 100,
    iva: ivaC / 100,
    total: (baseC + ivaC) / 100,
  };
}
