import { Component, OnInit, inject, input, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ApiService, mensajeError } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { ConfirmacionService } from '../../core/confirmacion.service';
import { Cliente, Oportunidad, Paginado, Venta } from '../../core/modelos';
import { NotificacionService } from '../../core/notificacion.service';
import { InsigniaComponent } from '../../shared/componentes';
import { HistorialComponent } from '../../shared/historial.component';
import { FechaGtPipe, QuetzalPipe } from '../../shared/pipes';

/** Ficha del cliente con oportunidades, compras e historial de interacciones (HU-02/03). */
@Component({
  selector: 'app-cliente-detalle',
  imports: [RouterLink, InsigniaComponent, HistorialComponent, QuetzalPipe, FechaGtPipe],
  template: `
    <div class="migas"><a routerLink="/clientes">Clientes</a> › Detalle</div>
    @if (error()) {
      <div class="aviso error">{{ error() }}</div>
    }
    @if (cliente(); as c) {
      <div class="pagina-encabezado">
        <div>
          <h1>{{ c.nombreCompleto }}</h1>
          <p><app-insignia [valor]="c.clasificacion" /> · Cliente desde {{ c.creadoEn | fechaGt }}</p>
        </div>
        <div class="acciones">
          <a
            [routerLink]="['/oportunidades/nueva']"
            [queryParams]="{ clienteId: c.id }"
            class="btn btn-primario"
            >+ Nueva oportunidad</a
          >
          <a [routerLink]="['/clientes', c.id, 'editar']" class="btn">Editar</a>
          @if (auth.esGerencia()) {
            <button type="button" class="btn btn-peligro" (click)="eliminar(c)">Eliminar</button>
          }
        </div>
      </div>

      <div class="rejilla rejilla-2">
        <div class="tarjeta">
          <h2>Datos de contacto</h2>
          <dl class="datos-lista">
            <dt>Teléfono</dt>
            <dd>{{ c.telefono }}</dd>
            <dt>Correo</dt>
            <dd>{{ c.email || '—' }}</dd>
            <dt>DPI</dt>
            <dd>{{ c.dpi || '—' }}</dd>
            <dt>NIT</dt>
            <dd>{{ c.nit }}</dd>
            <dt>Dirección</dt>
            <dd>{{ c.direccion || '—' }}</dd>
            <dt>Vendedor</dt>
            <dd>{{ c.vendedorNombre }}</dd>
            @if (c.prospectoOrigenId) {
              <dt>Origen</dt>
              <dd>Convertido desde el prospecto #{{ c.prospectoOrigenId }}</dd>
            }
          </dl>
        </div>
        <div class="tarjeta">
          <h2>Resumen de compras</h2>
          <dl class="datos-lista">
            <dt>Compras</dt>
            <dd>{{ c.compras }}</dd>
            <dt>Total comprado</dt>
            <dd>{{ c.totalComprado | quetzal }}</dd>
            <dt>Última compra</dt>
            <dd>{{ c.ultimaCompra | fechaGt }}</dd>
          </dl>
          @if (ventas().length) {
            <h3 class="sub">Ventas</h3>
            <ul class="lista-simple">
              @for (v of ventas(); track v.id) {
                <li>
                  <a [routerLink]="['/ventas', v.id]">{{ v.correlativo }}</a> · {{ v.fecha | fechaGt }} ·
                  {{ v.vehiculos }} · <strong>{{ v.total | quetzal }}</strong>
                </li>
              }
            </ul>
          }
        </div>
      </div>

      <div class="tarjeta">
        <h2>Oportunidades</h2>
        @if (oportunidades().length) {
          <div class="tabla-contenedor">
            <table class="tabla">
              <thead>
                <tr>
                  <th>Oportunidad</th>
                  <th>Etapa</th>
                  <th class="numero">Monto estimado</th>
                  <th>Cierre estimado</th>
                </tr>
              </thead>
              <tbody>
                @for (o of oportunidades(); track o.id) {
                  <tr>
                    <td>
                      <a [routerLink]="['/oportunidades', o.id]">{{ o.titulo }}</a>
                    </td>
                    <td><app-insignia [valor]="o.etapa" /></td>
                    <td class="numero">{{ o.montoEstimado | quetzal }}</td>
                    <td>{{ o.fechaCierreEstimada | fechaGt }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        } @else {
          <p class="texto-suave">
            Este cliente no tiene oportunidades. Use «Nueva oportunidad» para registrar su interés en un
            vehículo.
          </p>
        }
      </div>

      <app-historial [clienteId]="c.id" />
    } @else if (!error()) {
      <div class="cargando">Cargando cliente…</div>
    }
  `,
  styles: `
    .sub {
      margin-top: 1rem;
    }
    .lista-simple {
      padding-left: 1.1rem;
      margin: 0;
    }
  `,
})
export class ClienteDetalleComponent implements OnInit {
  readonly id = input.required<string>();
  readonly auth = inject(AuthService);
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  private readonly confirmacion = inject(ConfirmacionService);
  private readonly notificaciones = inject(NotificacionService);

  readonly cliente = signal<Cliente | null>(null);
  readonly oportunidades = signal<Oportunidad[]>([]);
  readonly ventas = signal<Venta[]>([]);
  readonly error = signal<string | null>(null);

  ngOnInit(): void {
    this.api.get<Cliente>(`/clientes/${this.id()}`).subscribe({
      next: (c) => this.cliente.set(c),
      error: (e) => this.error.set(mensajeError(e)),
    });
    this.api
      .get<Paginado<Oportunidad>>('/oportunidades', { clienteId: this.id(), tamano: 50 })
      .subscribe({ next: (r) => this.oportunidades.set(r.datos) });
    this.api
      .get<Paginado<Venta>>('/ventas', { clienteId: this.id(), tamano: 100 })
      .subscribe({ next: (r) => this.ventas.set(r.datos) });
  }

  async eliminar(c: Cliente): Promise<void> {
    const ok = await this.confirmacion.confirmar({
      titulo: 'Eliminar cliente',
      mensaje: `¿Eliminar a ${c.nombreCompleto}? Esta acción no se puede deshacer. Solo es posible si no tiene oportunidades ni ventas.`,
      textoConfirmar: 'Eliminar',
      peligro: true,
    });
    if (!ok) return;
    this.api.delete(`/clientes/${c.id}`).subscribe({
      next: () => {
        this.notificaciones.exito('Cliente eliminado.');
        this.router.navigate(['/clientes']);
      },
      error: (e) => this.notificaciones.error(mensajeError(e)),
    });
  }
}
