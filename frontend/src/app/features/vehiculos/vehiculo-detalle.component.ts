import { Component, OnInit, inject, input, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ApiService, mensajeError } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { ConfirmacionService } from '../../core/confirmacion.service';
import { Vehiculo } from '../../core/modelos';
import { NotificacionService } from '../../core/notificacion.service';
import { InsigniaComponent } from '../../shared/componentes';
import { FechaGtPipe, KilometrosPipe, QuetzalPipe } from '../../shared/pipes';

/** Ficha técnica del vehículo y control de disponibilidad (HU-07, HU-08). */
@Component({
  selector: 'app-vehiculo-detalle',
  imports: [RouterLink, InsigniaComponent, QuetzalPipe, KilometrosPipe, FechaGtPipe],
  template: `
    <div class="migas"><a routerLink="/vehiculos">Vehículos</a> › Ficha técnica</div>
    @if (error()) {
      <div class="aviso error">{{ error() }}</div>
    }

    @if (vehiculo(); as v) {
      <div class="pagina-encabezado">
        <div>
          <h1>{{ v.marca }} {{ v.modelo }} {{ v.anio }}</h1>
          <p>
            <app-insignia [valor]="v.estado" /> · {{ v.condicion }} · Registrado el {{ v.creadoEn | fechaGt }}
          </p>
        </div>
        <div class="acciones">
          @if (v.estado === 'Disponible') {
            <a routerLink="/oportunidades/nueva" class="btn btn-primario">Crear oportunidad</a>
          }
          @if (auth.esGerencia() && v.estado !== 'Vendido') {
            <a [routerLink]="['/vehiculos', v.id, 'editar']" class="btn">Editar</a>
            @if (v.estado === 'Disponible') {
              <button type="button" class="btn" (click)="cambiarEstado('Reservado')">Reservar</button>
            }
            @if (v.estado === 'Reservado' && !v.reservadoCotizacionId) {
              <button type="button" class="btn" (click)="cambiarEstado('Disponible')">Liberar reserva</button>
            }
            <button type="button" class="btn btn-peligro" (click)="eliminar(v)">Eliminar</button>
          }
        </div>
      </div>

      @if (v.reservadoCotizacionId && v.estado === 'Reservado') {
        <div class="aviso alerta">
          Reservado por la cotización aceptada
          <a [routerLink]="['/cotizaciones', v.reservadoCotizacionId]">#{{ v.reservadoCotizacionId }}</a
          >. Para liberarlo, rechace esa cotización.
        </div>
      }

      <div class="rejilla rejilla-2">
        <div class="tarjeta">
          <h2>Características técnicas</h2>
          <dl class="datos-lista">
            <dt>VIN</dt>
            <dd class="mono">
              {{ v.vin }}
              @if (v.vinDigitoVerificadorValido === false) {
                <span
                  class="insignia amarilla"
                  title="El dígito verificador no corresponde al estándar norteamericano"
                  >dígito verificador no estándar</span
                >
              }
            </dd>
            <dt>Marca / modelo</dt>
            <dd>{{ v.marca }} {{ v.modelo }}</dd>
            <dt>Versión</dt>
            <dd>{{ v.version || '—' }}</dd>
            <dt>Año</dt>
            <dd>{{ v.anio }}</dd>
            <dt>Tipo</dt>
            <dd>{{ v.tipo }}</dd>
            <dt>Color</dt>
            <dd>{{ v.color }}</dd>
            <dt>Transmisión</dt>
            <dd>{{ v.transmision }}</dd>
            <dt>Combustible</dt>
            <dd>{{ v.combustible }}</dd>
            <dt>Motor</dt>
            <dd>{{ v.motor || '—' }}</dd>
            <dt>Kilometraje</dt>
            <dd>{{ v.kilometraje | kilometros }}</dd>
          </dl>
        </div>
        <div class="tarjeta">
          <h2>Precio</h2>
          <dl class="datos-lista">
            <dt>Precio (sin IVA)</dt>
            <dd>{{ v.precio | quetzal }}</dd>
            <dt>IVA 12 %</dt>
            <dd>{{ v.precio * 0.12 | quetzal }}</dd>
            <dt>Precio con IVA</dt>
            <dd>
              <strong>{{ v.precio * 1.12 | quetzal }}</strong>
            </dd>
          </dl>
          @if (v.descripcion) {
            <h3 class="separado">Descripción</h3>
            <p>{{ v.descripcion }}</p>
          }
        </div>
      </div>
    } @else if (!error()) {
      <div class="cargando">Cargando vehículo…</div>
    }
  `,
  styles: `
    .separado {
      margin-top: 1rem;
    }
  `,
})
export class VehiculoDetalleComponent implements OnInit {
  readonly id = input.required<string>();
  readonly auth = inject(AuthService);
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  private readonly confirmacion = inject(ConfirmacionService);
  private readonly notificaciones = inject(NotificacionService);

  readonly vehiculo = signal<Vehiculo | null>(null);
  readonly error = signal<string | null>(null);

  ngOnInit(): void {
    this.api.get<Vehiculo>(`/vehiculos/${this.id()}`).subscribe({
      next: (v) => this.vehiculo.set(v),
      error: (e) => this.error.set(mensajeError(e)),
    });
  }

  cambiarEstado(estado: 'Disponible' | 'Reservado'): void {
    this.api.patch<Vehiculo>(`/vehiculos/${this.id()}/estado`, { estado }).subscribe({
      next: (v) => {
        this.vehiculo.set(v);
        this.notificaciones.exito(`Vehículo marcado como ${estado.toLowerCase()}.`);
      },
      error: (e) => this.notificaciones.error(mensajeError(e)),
    });
  }

  async eliminar(v: Vehiculo): Promise<void> {
    const ok = await this.confirmacion.confirmar({
      titulo: 'Eliminar vehículo',
      mensaje: `¿Eliminar ${v.marca} ${v.modelo} (VIN ${v.vin}) del catálogo? Solo es posible si nunca fue cotizado.`,
      textoConfirmar: 'Eliminar',
      peligro: true,
    });
    if (!ok) return;
    this.api.delete(`/vehiculos/${v.id}`).subscribe({
      next: () => {
        this.notificaciones.exito('Vehículo eliminado del catálogo.');
        this.router.navigate(['/vehiculos']);
      },
      error: (e) => this.notificaciones.error(mensajeError(e)),
    });
  }
}
