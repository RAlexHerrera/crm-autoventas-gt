import { Component, OnInit, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { ApiService, mensajeError } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { ConfirmacionService } from '../../core/confirmacion.service';
import { Oportunidad, Paginado, Prospecto } from '../../core/modelos';
import { NotificacionService } from '../../core/notificacion.service';
import { InsigniaComponent } from '../../shared/componentes';
import { HistorialComponent } from '../../shared/historial.component';
import { FechaGtPipe, QuetzalPipe } from '../../shared/pipes';
import { VendedoresService } from '../../shared/vendedores.service';

/** Ficha del prospecto: datos, oportunidades, asignación (HU-05), conversión e historial. */
@Component({
  selector: 'app-prospecto-detalle',
  imports: [FormsModule, RouterLink, InsigniaComponent, HistorialComponent, FechaGtPipe, QuetzalPipe],
  template: `
    <div class="migas"><a routerLink="/prospectos">Prospectos</a> › Detalle</div>
    @if (error()) {
      <div class="aviso error">{{ error() }}</div>
    }

    @if (prospecto(); as p) {
      <div class="pagina-encabezado">
        <div>
          <h1>{{ p.nombreCompleto }}</h1>
          <p>
            <app-insignia [valor]="p.estado" /> · Registrado el {{ p.creadoEn | fechaGt }} · Fuente:
            {{ p.fuente }}
          </p>
        </div>
        <div class="acciones">
          @if (p.estado !== 'Convertido' && p.estado !== 'Descartado') {
            <a
              routerLink="/oportunidades/nueva"
              [queryParams]="{ prospectoId: p.id }"
              class="btn btn-primario"
              >+ Nueva oportunidad</a
            >
            <button type="button" class="btn btn-exito" (click)="mostrarConversion.set(true)">
              Convertir en cliente
            </button>
            <a [routerLink]="['/prospectos', p.id, 'editar']" class="btn">Editar</a>
          }
          @if (p.clienteId) {
            <a [routerLink]="['/clientes', p.clienteId]" class="btn btn-primario">Ver ficha de cliente</a>
          }
          @if (auth.esGerencia() && p.estado !== 'Convertido') {
            <button type="button" class="btn btn-peligro" (click)="eliminar(p)">Eliminar</button>
          }
        </div>
      </div>

      <div class="rejilla rejilla-2">
        <div class="tarjeta">
          <h2>Datos de contacto</h2>
          <dl class="datos-lista">
            <dt>Teléfono</dt>
            <dd>{{ p.telefono }}</dd>
            <dt>Correo</dt>
            <dd>{{ p.email || '—' }}</dd>
            <dt>Interés</dt>
            <dd>{{ p.interes || '—' }}</dd>
            <dt>Vendedor</dt>
            <dd>{{ p.vendedorNombre }}</dd>
          </dl>
        </div>
        @if (auth.esGerencia() && p.estado !== 'Convertido') {
          <div class="tarjeta">
            <h2>Asignación de vendedor</h2>
            <p class="texto-suave texto-pequeno">
              Las oportunidades abiertas del prospecto se reasignan junto con él.
            </p>
            <div class="barra-filtros">
              <div class="campo">
                <label for="asignar">Vendedor</label>
                <select id="asignar" [(ngModel)]="vendedorSeleccionado">
                  @for (v of vendedores(); track v.id) {
                    <option [ngValue]="v.id">{{ v.nombre }}</option>
                  }
                </select>
              </div>
              <button
                type="button"
                class="btn btn-primario"
                [disabled]="vendedorSeleccionado === p.vendedorId"
                (click)="asignar()"
              >
                Asignar
              </button>
            </div>
          </div>
        }
      </div>

      <div class="tarjeta">
        <h2>Oportunidades</h2>
        @if (oportunidades().length) {
          <div class="tabla-contenedor">
            <table class="tabla">
              <thead>
                <tr>
                  <th>Oportunidad</th>
                  <th>Vehículo de interés</th>
                  <th>Etapa</th>
                  <th class="numero">Monto</th>
                </tr>
              </thead>
              <tbody>
                @for (o of oportunidades(); track o.id) {
                  <tr>
                    <td>
                      <a [routerLink]="['/oportunidades', o.id]">{{ o.titulo }}</a>
                    </td>
                    <td>{{ o.vehiculoInteres || '—' }}</td>
                    <td><app-insignia [valor]="o.etapa" /></td>
                    <td class="numero">{{ o.montoEstimado | quetzal }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        } @else {
          <p class="texto-suave">
            Sin oportunidades. Cree una para registrar el vehículo de interés y avanzar en el embudo.
          </p>
        }
      </div>

      <app-historial [prospectoId]="p.id" [clienteId]="p.clienteId" />

      @if (mostrarConversion()) {
        <div class="dialogo-fondo">
          <form
            class="dialogo"
            role="dialog"
            aria-modal="true"
            aria-labelledby="conv-titulo"
            (ngSubmit)="convertir()"
          >
            <h2 id="conv-titulo">Convertir en cliente</h2>
            <p class="texto-suave">
              Se creará la ficha de cliente con los datos del prospecto. Puede completar estos datos ahora
              (opcional):
            </p>
            <div class="formulario">
              <div class="campo">
                <label for="c-dpi">DPI</label>
                <input
                  id="c-dpi"
                  name="dpi"
                  [(ngModel)]="datosCliente.dpi"
                  maxlength="13"
                  inputmode="numeric"
                />
              </div>
              <div class="campo">
                <label for="c-nit">NIT</label>
                <input id="c-nit" name="nit" [(ngModel)]="datosCliente.nit" maxlength="15" placeholder="CF" />
              </div>
              <div class="campo ancho-completo">
                <label for="c-dir">Dirección</label>
                <input id="c-dir" name="direccion" [(ngModel)]="datosCliente.direccion" maxlength="255" />
              </div>
            </div>
            <div class="formulario-acciones">
              <button type="button" class="btn" (click)="mostrarConversion.set(false)">Cancelar</button>
              <button type="submit" class="btn btn-exito" [disabled]="procesando()">Convertir</button>
            </div>
          </form>
        </div>
      }
    } @else if (!error()) {
      <div class="cargando">Cargando prospecto…</div>
    }
  `,
})
export class ProspectoDetalleComponent implements OnInit {
  readonly id = input.required<string>();
  readonly auth = inject(AuthService);
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  private readonly confirmacion = inject(ConfirmacionService);
  private readonly notificaciones = inject(NotificacionService);
  readonly vendedores = toSignal(inject(VendedoresService).lista(), { initialValue: [] });

  readonly prospecto = signal<Prospecto | null>(null);
  readonly oportunidades = signal<Oportunidad[]>([]);
  readonly error = signal<string | null>(null);
  readonly mostrarConversion = signal(false);
  readonly procesando = signal(false);
  vendedorSeleccionado: number | null = null;
  datosCliente = { dpi: '', nit: 'CF', direccion: '' };

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.api.get<Prospecto>(`/prospectos/${this.id()}`).subscribe({
      next: (p) => {
        this.prospecto.set(p);
        this.vendedorSeleccionado = p.vendedorId;
      },
      error: (e) => this.error.set(mensajeError(e)),
    });
    this.api
      .get<Paginado<Oportunidad>>('/oportunidades', { prospectoId: this.id(), tamano: 50 })
      .subscribe({ next: (r) => this.oportunidades.set(r.datos) });
  }

  asignar(): void {
    this.api
      .patch<Prospecto>(`/prospectos/${this.id()}/asignar`, { vendedorId: this.vendedorSeleccionado })
      .subscribe({
        next: (p) => {
          this.prospecto.set(p);
          this.notificaciones.exito(`Prospecto asignado a ${p.vendedorNombre}.`);
          this.cargar();
        },
        error: (e) => this.notificaciones.error(mensajeError(e)),
      });
  }

  convertir(): void {
    this.procesando.set(true);
    this.api.post<{ clienteId: number }>(`/prospectos/${this.id()}/convertir`, this.datosCliente).subscribe({
      next: (r) => {
        this.notificaciones.exito('Prospecto convertido en cliente.');
        this.router.navigate(['/clientes', r.clienteId]);
      },
      error: (e) => {
        this.procesando.set(false);
        this.notificaciones.error(mensajeError(e));
      },
    });
  }

  async eliminar(p: Prospecto): Promise<void> {
    const ok = await this.confirmacion.confirmar({
      titulo: 'Eliminar prospecto',
      mensaje: `¿Eliminar a ${p.nombreCompleto}? Solo es posible si no tiene oportunidades. Considere marcarlo como «Descartado».`,
      textoConfirmar: 'Eliminar',
      peligro: true,
    });
    if (!ok) return;
    this.api.delete(`/prospectos/${p.id}`).subscribe({
      next: () => {
        this.notificaciones.exito('Prospecto eliminado.');
        this.router.navigate(['/prospectos']);
      },
      error: (e) => this.notificaciones.error(mensajeError(e)),
    });
  }
}
