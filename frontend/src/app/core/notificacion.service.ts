import { Injectable, signal } from '@angular/core';

export interface Notificacion {
  id: number;
  tipo: 'exito' | 'error' | 'info';
  texto: string;
}

/** Mensajes emergentes (toasts) que desaparecen solos. */
@Injectable({ providedIn: 'root' })
export class NotificacionService {
  private siguienteId = 1;
  readonly lista = signal<Notificacion[]>([]);

  exito(texto: string): void {
    this.agregar('exito', texto);
  }

  error(texto: string): void {
    this.agregar('error', texto, 7000);
  }

  info(texto: string): void {
    this.agregar('info', texto);
  }

  cerrar(id: number): void {
    this.lista.update((l) => l.filter((n) => n.id !== id));
  }

  private agregar(tipo: Notificacion['tipo'], texto: string, duracion = 4500): void {
    // Evita duplicar el mismo mensaje si ya está visible.
    if (this.lista().some((n) => n.texto === texto)) return;
    const id = this.siguienteId++;
    this.lista.update((l) => [...l, { id, tipo, texto }]);
    setTimeout(() => this.cerrar(id), duracion);
  }
}
