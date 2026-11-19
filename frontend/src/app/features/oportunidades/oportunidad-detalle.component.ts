import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { ApiService, mensajeError } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { ConfirmacionService } from '../../core/confirmacion.service';
import { ETAPAS } from '../../core/catalogos';
import { Oportunidad } from '../../core/modelos';
import { NotificacionService } from '../../core/notificacion.service';
import { InsigniaComponent } from '../../shared/componentes';
import { HistorialComponent } from '../../shared/historial.component';
import { FechaGtPipe, QuetzalPipe } from '../../shared/pipes';
import { VendedoresService } from '../../shared/vendedores.service';

/** Detalle de oportunidad: avance por etapas, cotizaciones e historial (HU-06). */
@Component({
  selector: 'app-oportunidad-detalle',
  imports: [FormsModule, RouterLink, InsigniaComponent, HistorialComponent, QuetzalPipe, FechaGtPipe],
  template: `
    <div class="migas"><a routerLink="/oportunidades">Oportunidades</a> › Detalle</div>
    @if (error()) {
      <div class="aviso error">{{ error() }}</div>
    }

    @if (op(); as o) {
      <div class="pagina-encabezado">
        <div>
          <h1>{{ o.titulo }}</h1>
          <p>
            <app-insignia [valor]="o.etapa" /> · Creada el {{ o.creadoEn | fechaGt }} · Vendedor:
            {{ o.vendedorNombre }}
          </p>
        </div>
        <div class="acciones">
          @if (abierta()) {
            <a
              routerLink="/cotizaciones/nueva"
              [queryParams]="{ oportunidadId: o.id }"
              class="btn btn-primario"
              >+ Nueva cotización</a
            >
            <a [routerLink]="['/oportunidades', o.id, 'editar']" class="btn">Editar</a>
          }
        </div>
      </div>

      <!-- Progreso del embudo -->
      <ol class="progreso" aria-label="Etapas del embudo">
        @for (e of etapasEmbudo; track e) {
          <li [class.hecha]="indice(e) < indice(o.etapa)" [class.actual]="e === o.etapa">{{ e }}</li>
        }
      </ol>

      <div class="rejilla rejilla-2">
        <div class="tarjeta">
          <h2>Información</h2>
          <dl class="datos-lista">
            <dt>{{ o.contactoTipo }}</dt>
            <dd>
              <a [routerLink]="o.clienteId ? ['/clientes', o.clienteId] : ['/prospectos', o.prospectoId]">{{
                o.contactoNombre
              }}</a>
            </dd>
            <dt>Vehículo de interés</dt>
            <dd>
              @if (o.vehiculoInteresId) {
                <a [routerLink]="['/vehiculos', o.vehiculoInteresId]">{{ o.vehiculoInteres }}</a>
              } @else {
                —
              }
            </dd>
            <dt>Monto estimado</dt>
            <dd>{{ o.montoEstimado | quetzal }}</dd>
            <dt>Cierre estimado</dt>
            <dd>{{ o.fechaCierreEstimada | fechaGt }}</dd>
            @if (o.cerradaEn) {
              <dt>Cerrada el</dt>
              <dd>{{ o.cerradaEn | fechaGt: true }}</dd>
            }
            @if (o.motivoPerdida) {
              <dt>Motivo de pérdida</dt>
              <dd>{{ o.motivoPerdida }}</dd>
            }
          </dl>
        </div>

        <div class="tarjeta">
          @if (abierta()) {
            <h2>Cambiar etapa</h2>
            <p class="texto-suave texto-pequeno">
              «Ganado» se asigna automáticamente al registrar la venta. Al marcar «Perdido» se rechazan las
              cotizaciones abiertas y se liberan los vehículos reservados.
            </p>
            <div class="formulario">
              <div class="campo">
                <label for="etapa">Nueva etapa</label>
                <select id="etapa" [(ngModel)]="nuevaEtapa">
                  @for (e of etapasManuales; track e) {
                    <option [value]="e" [disabled]="e === o.etapa">{{ e }}</option>
                  }
                </select>
              </div>
              @if (nuevaEtapa === 'Perdido') {
                <div class="campo ancho-completo">
                  <label for="motivo">Motivo de la pérdida <span class="requerido">*</span></label>
                  <input
                    id="motivo"
                    [(ngModel)]="motivo"
                    maxlength="255"
                    placeholder="Ej.: eligió otra marca"
                  />
                </div>
              }
              <div class="formulario-acciones">
                <button
                  type="button"
                  class="btn btn-primario"
                  [disabled]="!nuevaEtapa || nuevaEtapa === o.etapa"
                  (click)="cambiarEtapa()"
                >
                  Actualizar etapa
                </button>
              </div>
            </div>
            @if (auth.esGerencia()) {
              <h3 class="separado">Reasignar vendedor</h3>
              <div class="barra-filtros">
                <div class="campo">
                  <label for="vend">Vendedor</label>
                  <select id="vend" [(ngModel)]="vendedorId">
                    @for (v of vendedores(); track v.id) {
                      <option [ngValue]="v.id">{{ v.nombre }}</option>
                    }
                  </select>
                </div>
                <button
                  type="button"
                  class="btn"
                  [disabled]="vendedorId === o.vendedorId"
                  (click)="asignar()"
                >
                  Reasignar
                </button>
              </div>
            }
          } @else {
            <h2>Oportunidad cerrada</h2>
            <p>
              Esta oportunidad terminó como <app-insignia [valor]="o.etapa" />. Ya no admite cambios de etapa.
            </p>
          }
        </div>
      </div>

      <div class="tarjeta">
        <h2>Cotizaciones</h2>
        @if (o.cotizaciones?.length) {
          <div class="tabla-contenedor">
            <table class="tabla">
              <thead>
                <tr>
                  <th>Correlativo</th>
                  <th>Fecha</th>
                  <th>Vigencia</th>
                  <th>Estado</th>
                  <th class="numero">Total</th>
                </tr>
              </thead>
              <tbody>
                @for (c of o.cotizaciones; track c.id) {
                  <tr>
                    <td>
                      <a [routerLink]="['/cotizaciones', c.id]" class="mono">{{ c.correlativo }}</a>
                    </td>
                    <td>{{ c.fecha | fechaGt }}</td>
                    <td>{{ c.vigenciaHasta | fechaGt }}</td>
                    <td><app-insignia [valor]="c.estado" /></td>
                    <td class="numero">{{ c.total | quetzal }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        } @else {
          <p class="texto-suave">
            Aún no hay cotizaciones. Cree una para ofrecer un vehículo disponible con precio, descuento e IVA.
          </p>
        }
      </div>

      <app-historial [oportunidadId]="o.id" [clienteId]="o.clienteId" [prospectoId]="o.prospectoId" />
    } @else if (!error()) {
      <div class="cargando">Cargando oportunidad…</div>
    }
  `,
  styles: `
    .progreso {
      display: flex;
      list-style: none;
      padding: 0;
      margin: 0 0 1rem;
      gap: 0.25rem;
      overflow-x: auto;
    }
    .progreso li {
      flex: 1;
      text-align: center;
      padding: 0.45rem 0.5rem;
      background: #e5e7eb;
      color: #4b5563;
      font-size: 0.82rem;
      white-space: nowrap;
      border-radius: 6px;
    }
    .progreso li.hecha {
      background: #bfdbfe;
      color: #1e3a8a;
    }
    .progreso li.actual {
      background: var(--c-primario);
      color: #fff;
      font-weight: 600;
    }
    .separado {
      margin-top: 1.2rem;
    }
  `,
})
export class OportunidadDetalleComponent implements OnInit {
  readonly id = input.required<string>();
  readonly auth = inject(AuthService);
  private readonly api = inject(ApiService);
  private readonly confirmacion = inject(ConfirmacionService);
  private readonly notificaciones = inject(NotificacionService);
  readonly vendedores = toSignal(inject(VendedoresService).lista(), { initialValue: [] });

  readonly op = signal<Oportunidad | null>(null);
  readonly error = signal<string | null>(null);
  readonly abierta = computed(() => !['Ganado', 'Perdido'].includes(this.op()?.etapa ?? ''));
  readonly etapasEmbudo = ['Prospección', 'Contacto', 'Cotización', 'Negociación', 'Ganado'];
  readonly etapasManuales = ETAPAS.filter((e) => e !== 'Ganado');
  nuevaEtapa = '';
  motivo = '';
  vendedorId: number | null = null;

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.api.get<Oportunidad>(`/oportunidades/${this.id()}`).subscribe({
      next: (o) => {
        this.op.set(o);
        this.nuevaEtapa = '';
        this.motivo = '';
        this.vendedorId = o.vendedorId;
      },
      error: (e) => this.error.set(mensajeError(e)),
    });
  }

  indice(etapa: string): number {
    return this.etapasEmbudo.indexOf(etapa);
  }

  async cambiarEtapa(): Promise<void> {
    if (this.nuevaEtapa === 'Perdido') {
      if (!this.motivo.trim()) {
        this.notificaciones.error('Indique el motivo por el que se perdió la oportunidad.');
        return;
      }
      const ok = await this.confirmacion.confirmar({
        titulo: 'Marcar como perdida',
        mensaje:
          'La oportunidad se cerrará, sus cotizaciones abiertas se rechazarán y los vehículos reservados quedarán disponibles. ¿Continuar?',
        textoConfirmar: 'Marcar como perdida',
        peligro: true,
      });
      if (!ok) return;
    }
    this.api
      .patch<Oportunidad>(`/oportunidades/${this.id()}/etapa`, {
        etapa: this.nuevaEtapa,
        motivoPerdida: this.motivo,
      })
      .subscribe({
        next: () => {
          this.notificaciones.exito('Etapa actualizada.');
          this.cargar();
        },
        error: (e) => this.notificaciones.error(mensajeError(e)),
      });
  }

  asignar(): void {
    this.api
      .patch<Oportunidad>(`/oportunidades/${this.id()}/asignar`, { vendedorId: this.vendedorId })
      .subscribe({
        next: () => {
          this.notificaciones.exito('Oportunidad reasignada.');
          this.cargar();
        },
        error: (e) => this.notificaciones.error(mensajeError(e)),
      });
  }
}
