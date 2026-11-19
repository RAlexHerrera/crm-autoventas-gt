import { Component, computed, inject, input, output } from '@angular/core';
import { ConfirmacionService } from '../core/confirmacion.service';
import { NotificacionService } from '../core/notificacion.service';
import { colorEstado } from '../core/catalogos';

/** Insignia de color según estado, etapa o clasificación. */
@Component({
  selector: 'app-insignia',
  template: `<span [class]="'insignia ' + color()">{{ valor() }}</span>`,
})
export class InsigniaComponent {
  readonly valor = input<string | null | undefined>('');
  readonly color = computed(() => colorEstado(this.valor()));
}

/** Controles de paginación para tablas. */
@Component({
  selector: 'app-paginacion',
  template: `
    @if (total() > 0) {
      <nav class="paginacion" aria-label="Paginación">
        <span class="texto-suave texto-pequeno">
          Mostrando {{ desde() }}–{{ hasta() }} de {{ total() }} registros
        </span>
        <span class="acciones">
          <button
            type="button"
            class="btn btn-chico"
            [disabled]="pagina() <= 1"
            (click)="cambiar.emit(pagina() - 1)"
          >
            ‹ Anterior
          </button>
          <span class="texto-pequeno">Página {{ pagina() }} de {{ paginas() }}</span>
          <button
            type="button"
            class="btn btn-chico"
            [disabled]="pagina() >= paginas()"
            (click)="cambiar.emit(pagina() + 1)"
          >
            Siguiente ›
          </button>
        </span>
      </nav>
    }
  `,
  styles: `
    .paginacion {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      justify-content: space-between;
      align-items: center;
      margin-top: 0.75rem;
    }
  `,
})
export class PaginacionComponent {
  readonly pagina = input(1);
  readonly paginas = input(1);
  readonly total = input(0);
  readonly tamano = input(10);
  readonly cambiar = output<number>();
  readonly desde = computed(() => (this.pagina() - 1) * this.tamano() + 1);
  readonly hasta = computed(() => Math.min(this.pagina() * this.tamano(), this.total()));
}

/** Estado vacío con explicación y, opcionalmente, una acción sugerida. */
@Component({
  selector: 'app-estado-vacio',
  template: `
    <div class="vacio">
      <div class="icono" aria-hidden="true">{{ icono() }}</div>
      <h3>{{ titulo() }}</h3>
      <p class="texto-suave">{{ mensaje() }}</p>
      <ng-content />
    </div>
  `,
  styles: `
    .vacio {
      text-align: center;
      padding: 2rem 1rem;
    }
    .icono {
      font-size: 2.2rem;
    }
    p {
      max-width: 460px;
      margin: 0.25rem auto 1rem;
    }
  `,
})
export class EstadoVacioComponent {
  readonly icono = input('📭');
  readonly titulo = input('No hay registros');
  readonly mensaje = input('');
}

/** Contenedor global de notificaciones emergentes. */
@Component({
  selector: 'app-notificaciones',
  template: `
    <div class="contenedor" aria-live="polite">
      @for (n of servicio.lista(); track n.id) {
        <div [class]="'toast ' + n.tipo" role="status">
          <span>{{ n.texto }}</span>
          <button type="button" class="cerrar" aria-label="Cerrar mensaje" (click)="servicio.cerrar(n.id)">
            ×
          </button>
        </div>
      }
    </div>
  `,
  styles: `
    .contenedor {
      position: fixed;
      right: 1rem;
      bottom: 1rem;
      z-index: 1100;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      max-width: min(420px, calc(100vw - 2rem));
    }
    .toast {
      display: flex;
      gap: 0.75rem;
      align-items: flex-start;
      padding: 0.75rem 0.9rem;
      border-radius: 8px;
      color: #fff;
      box-shadow: 0 8px 24px rgb(0 0 0 / 18%);
    }
    .toast.exito {
      background: #15803d;
    }
    .toast.error {
      background: #b91c1c;
    }
    .toast.info {
      background: #1d4ed8;
    }
    .toast span {
      flex: 1;
    }
    .cerrar {
      background: none;
      border: none;
      color: #fff;
      font-size: 1.2rem;
      cursor: pointer;
      line-height: 1;
    }
  `,
})
export class NotificacionesComponent {
  readonly servicio = inject(NotificacionService);
}

/** Diálogo global de confirmación. */
@Component({
  selector: 'app-confirmacion',
  template: `
    @if (servicio.activa(); as c) {
      <div class="dialogo-fondo">
        <div
          class="dialogo"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="conf-titulo"
          aria-describedby="conf-texto"
        >
          <h2 id="conf-titulo">{{ c.titulo }}</h2>
          <p id="conf-texto">{{ c.mensaje }}</p>
          <div class="formulario-acciones">
            <button type="button" class="btn" (click)="servicio.responder(false)">Cancelar</button>
            <button
              type="button"
              class="btn"
              [class.btn-peligro-solido]="c.peligro"
              [class.btn-primario]="!c.peligro"
              (click)="servicio.responder(true)"
            >
              {{ c.textoConfirmar || 'Confirmar' }}
            </button>
          </div>
        </div>
      </div>
    }
  `,
})
export class ConfirmacionComponent {
  readonly servicio = inject(ConfirmacionService);
}
