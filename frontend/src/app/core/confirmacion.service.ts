import { Injectable, signal } from '@angular/core';

export interface SolicitudConfirmacion {
  titulo: string;
  mensaje: string;
  textoConfirmar?: string;
  peligro?: boolean;
}

interface ConfirmacionActiva extends SolicitudConfirmacion {
  resolver: (valor: boolean) => void;
}

/** Diálogo de confirmación para acciones destructivas o irreversibles. */
@Injectable({ providedIn: 'root' })
export class ConfirmacionService {
  readonly activa = signal<ConfirmacionActiva | null>(null);

  confirmar(solicitud: SolicitudConfirmacion): Promise<boolean> {
    return new Promise((resolver) => this.activa.set({ ...solicitud, resolver }));
  }

  responder(valor: boolean): void {
    const actual = this.activa();
    this.activa.set(null);
    actual?.resolver(valor);
  }
}
