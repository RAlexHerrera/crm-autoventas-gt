import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ErrorApi } from './modelos';

export type Parametros = Record<string, string | number | boolean | null | undefined>;

/** Convierte un objeto en parámetros de consulta omitiendo vacíos. */
export function aParams(p: Parametros = {}): HttpParams {
  let params = new HttpParams();
  for (const [k, v] of Object.entries(p)) {
    if (v !== null && v !== undefined && v !== '') params = params.set(k, String(v));
  }
  return params;
}

/** Extrae un mensaje entendible de un error HTTP de la API. */
export function mensajeError(error: unknown, porDefecto = 'Ocurrió un error inesperado.'): string {
  if (error instanceof HttpErrorResponse) {
    const cuerpo = error.error as ErrorApi | null;
    if (cuerpo?.mensaje) return cuerpo.mensaje;
    if (error.status === 0) return 'No se pudo conectar con el servidor.';
  }
  return porDefecto;
}

/** Errores de validación por campo devueltos por la API (400). */
export function erroresCampos(error: unknown): Record<string, string> {
  const resultado: Record<string, string> = {};
  if (error instanceof HttpErrorResponse) {
    for (const e of (error.error as ErrorApi | null)?.errores ?? []) {
      resultado[e.campo] ??= e.mensaje;
    }
  }
  return resultado;
}

/** Cliente HTTP delgado para la API REST (/api). */
@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);

  get<T>(ruta: string, params?: Parametros): Observable<T> {
    return this.http.get<T>(`/api${ruta}`, { params: aParams(params) });
  }

  post<T>(ruta: string, cuerpo: unknown): Observable<T> {
    return this.http.post<T>(`/api${ruta}`, cuerpo);
  }

  put<T>(ruta: string, cuerpo: unknown): Observable<T> {
    return this.http.put<T>(`/api${ruta}`, cuerpo);
  }

  patch<T>(ruta: string, cuerpo: unknown): Observable<T> {
    return this.http.patch<T>(`/api${ruta}`, cuerpo);
  }

  delete<T = void>(ruta: string): Observable<T> {
    return this.http.delete<T>(`/api${ruta}`);
  }

  /** Descarga un archivo binario (PDF). */
  descargar(ruta: string): Observable<Blob> {
    return this.http.get(`/api${ruta}`, { responseType: 'blob' });
  }
}
