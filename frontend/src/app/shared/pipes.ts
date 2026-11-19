import { Pipe, PipeTransform } from '@angular/core';

// Formato usado en Guatemala: Q1,234.56 (coma de miles, punto decimal). Se arma
// manualmente porque Intl con es-GT inserta espacios distintos según la versión de ICU.
const formatoNumero = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Formatea montos en quetzales: 1234.5 → "Q1,234.50". */
export function formatearQuetzales(valor: number | string | null | undefined): string {
  if (valor === null || valor === undefined || valor === '') return '—';
  const n = Number(valor);
  if (!Number.isFinite(n)) return '—';
  return `${n < 0 ? '-' : ''}Q${formatoNumero.format(Math.abs(n))}`;
}

/**
 * Formatea fechas de la API ("AAAA-MM-DD" o "AAAA-MM-DD HH:mm:ss", hora de
 * Guatemala) al formato local dd/mm/aaaa [hh:mm] sin conversiones de zona horaria.
 */
export function formatearFechaGt(valor: string | null | undefined, conHora = false): string {
  if (!valor) return '—';
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}))?/.exec(valor);
  if (!m) return valor;
  const fecha = `${m[3]}/${m[2]}/${m[1]}`;
  return conHora && m[4] ? `${fecha} ${m[4]}:${m[5]}` : fecha;
}

@Pipe({ name: 'quetzal' })
export class QuetzalPipe implements PipeTransform {
  transform(valor: number | string | null | undefined): string {
    return formatearQuetzales(valor);
  }
}

@Pipe({ name: 'fechaGt' })
export class FechaGtPipe implements PipeTransform {
  transform(valor: string | null | undefined, conHora = false): string {
    return formatearFechaGt(valor, conHora);
  }
}

@Pipe({ name: 'porcentaje' })
export class PorcentajePipe implements PipeTransform {
  transform(valor: number | null | undefined, decimales = 1): string {
    const n = Number(valor);
    return Number.isFinite(n) ? `${(n * 100).toFixed(decimales)} %` : '—';
  }
}

@Pipe({ name: 'kilometros' })
export class KilometrosPipe implements PipeTransform {
  transform(valor: number | null | undefined): string {
    return `${new Intl.NumberFormat('es-GT').format(Number(valor) || 0)} km`;
  }
}
