import { Component, effect, inject, input, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApiService, mensajeError } from '../core/api.service';
import { TIPOS_INTERACCION } from '../core/catalogos';
import { Interaccion } from '../core/modelos';
import { NotificacionService } from '../core/notificacion.service';
import { FechaGtPipe } from './pipes';

/**
 * Historial de interacciones (HU-03) de un cliente, prospecto u oportunidad,
 * con formulario para registrar una nueva.
 */
@Component({
  selector: 'app-historial',
  imports: [ReactiveFormsModule, FechaGtPipe],
  template: `
    <div class="tarjeta">
      <div class="pagina-encabezado">
        <h2>Historial de interacciones</h2>
        @if (permitirRegistro()) {
          <button
            type="button"
            class="btn btn-primario btn-chico"
            (click)="mostrarFormulario.set(!mostrarFormulario())"
          >
            {{ mostrarFormulario() ? 'Cancelar' : '+ Registrar interacción' }}
          </button>
        }
      </div>

      @if (mostrarFormulario()) {
        <form class="formulario nueva" [formGroup]="form" (ngSubmit)="guardar()" novalidate>
          <div class="campo">
            <label for="h-tipo">Tipo <span class="requerido">*</span></label>
            <select id="h-tipo" formControlName="tipo">
              @for (t of tipos; track t) {
                <option [value]="t">{{ t }}</option>
              }
            </select>
          </div>
          <div class="campo">
            <label for="h-fecha">Fecha y hora</label>
            <input id="h-fecha" type="datetime-local" formControlName="fecha" />
            <span class="ayuda">Si la deja vacía se usa la fecha y hora actual.</span>
          </div>
          <div class="campo ancho-completo">
            <label for="h-desc">Descripción <span class="requerido">*</span></label>
            <textarea
              id="h-desc"
              formControlName="descripcion"
              maxlength="1000"
              placeholder="¿Qué se habló o acordó?"
            ></textarea>
            @if (form.controls.descripcion.touched && form.controls.descripcion.invalid) {
              <span class="error-campo">Describa la interacción (mínimo 3 caracteres).</span>
            }
          </div>
          <div class="formulario-acciones">
            <button type="submit" class="btn btn-primario" [disabled]="guardando()">
              {{ guardando() ? 'Guardando…' : 'Guardar interacción' }}
            </button>
          </div>
        </form>
      }

      @if (cargando()) {
        <div class="cargando">Cargando historial…</div>
      } @else if (interacciones().length === 0) {
        <p class="texto-suave">
          Aún no hay interacciones registradas. Registre llamadas, visitas o correos para dar seguimiento.
        </p>
      } @else {
        <ul class="linea-tiempo">
          @for (i of interacciones(); track i.id) {
            <li [class.sistema]="i.tipo === 'Sistema'">
              <div>
                <strong>{{ i.tipo }}</strong> — {{ i.descripcion }}
              </div>
              <div class="meta">
                {{ i.fecha | fechaGt: true }} · {{ i.usuarioNombre }}
                @if (i.oportunidadTitulo && !oportunidadId()) {
                  · Oportunidad: {{ i.oportunidadTitulo }}
                }
              </div>
            </li>
          }
        </ul>
      }
    </div>
  `,
  styles: `
    .nueva {
      margin-bottom: 1rem;
      padding-bottom: 1rem;
      border-bottom: 1px solid var(--c-borde);
    }
  `,
})
export class HistorialComponent {
  private readonly api = inject(ApiService);
  private readonly notificaciones = inject(NotificacionService);
  private readonly fb = inject(FormBuilder);

  readonly clienteId = input<number | null>(null);
  readonly prospectoId = input<number | null>(null);
  readonly oportunidadId = input<number | null>(null);
  readonly permitirRegistro = input(true);

  readonly tipos = TIPOS_INTERACCION;
  readonly interacciones = signal<Interaccion[]>([]);
  readonly cargando = signal(true);
  readonly guardando = signal(false);
  readonly mostrarFormulario = signal(false);

  readonly form = this.fb.nonNullable.group({
    tipo: ['Llamada', Validators.required],
    fecha: [''],
    descripcion: ['', [Validators.required, Validators.minLength(3)]],
  });

  constructor() {
    effect(() => {
      this.clienteId();
      this.prospectoId();
      this.oportunidadId();
      this.cargar();
    });
  }

  cargar(): void {
    this.cargando.set(true);
    this.api.get<Interaccion[]>('/interacciones', this.filtroConsulta()).subscribe({
      next: (d) => {
        this.interacciones.set(d);
        this.cargando.set(false);
      },
      error: () => this.cargando.set(false),
    });
  }

  /** En una oportunidad se muestra solo su historial; en un cliente, también el de su prospecto de origen. */
  private filtroConsulta() {
    if (this.oportunidadId()) return { oportunidadId: this.oportunidadId() };
    if (this.clienteId()) return { clienteId: this.clienteId() };
    return { prospectoId: this.prospectoId() };
  }

  guardar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.guardando.set(true);
    const v = this.form.getRawValue();
    this.api
      .post('/interacciones', {
        clienteId: this.clienteId(),
        prospectoId: this.prospectoId(),
        oportunidadId: this.oportunidadId(),
        tipo: v.tipo,
        descripcion: v.descripcion,
        fecha: v.fecha || null,
      })
      .subscribe({
        next: () => {
          this.guardando.set(false);
          this.mostrarFormulario.set(false);
          this.form.reset({ tipo: 'Llamada', fecha: '', descripcion: '' });
          this.notificaciones.exito('Interacción registrada.');
          this.cargar();
        },
        error: (e) => {
          this.guardando.set(false);
          this.notificaciones.error(mensajeError(e));
        },
      });
  }
}
