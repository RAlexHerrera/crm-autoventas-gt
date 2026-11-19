import { Component, OnInit, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink, Routes } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { ApiService, mensajeError } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { Paginado, Venta } from '../../core/modelos';
import { EstadoVacioComponent, PaginacionComponent } from '../../shared/componentes';
import { ListaBase } from '../../shared/lista-base';
import { FechaGtPipe, QuetzalPipe } from '../../shared/pipes';
import { VendedoresService } from '../../shared/vendedores.service';

/** Listado de ventas registradas (HU-10). */
@Component({
  selector: 'app-ventas-lista',
  imports: [FormsModule, RouterLink, PaginacionComponent, EstadoVacioComponent, FechaGtPipe, QuetzalPipe],
  template: `
    <div class="pagina-encabezado">
      <div>
        <h1>Ventas</h1>
        <p>Las ventas se registran desde una cotización aceptada (botón «Registrar venta»).</p>
      </div>
      <div class="acciones"><a routerLink="/cotizaciones" class="btn">Ir a cotizaciones</a></div>
    </div>

    <div class="barra-filtros">
      <div class="campo busqueda">
        <label for="q">Buscar</label>
        <input
          id="q"
          type="search"
          [(ngModel)]="q"
          (input)="buscar()"
          placeholder="Correlativo de venta o cotización, cliente"
        />
      </div>
      <div class="campo">
        <label for="desde">Desde</label>
        <input id="desde" type="date" [(ngModel)]="filtros['desde']" (change)="filtrar()" />
      </div>
      <div class="campo">
        <label for="hasta">Hasta</label>
        <input id="hasta" type="date" [(ngModel)]="filtros['hasta']" (change)="filtrar()" />
      </div>
      @if (auth.esGerencia()) {
        <div class="campo">
          <label for="vend">Vendedor</label>
          <select id="vend" [(ngModel)]="filtros['vendedorId']" (change)="filtrar()">
            <option [ngValue]="undefined">Todos</option>
            @for (v of vendedores(); track v.id) {
              <option [value]="v.id">{{ v.nombre }}</option>
            }
          </select>
        </div>
      }
      @if (hayFiltros()) {
        <button type="button" class="btn" (click)="limpiarFiltros()">Limpiar filtros</button>
      }
    </div>

    @if (error()) {
      <div class="aviso error">{{ error() }}</div>
    }

    @if (cargando() && !datos()) {
      <div class="cargando">Cargando ventas…</div>
    } @else if (datos(); as d) {
      @if (d.total === 0) {
        <div class="tarjeta">
          <app-estado-vacio
            icono="💰"
            titulo="No hay ventas"
            mensaje="Cuando un cliente acepte una cotización, regístrela como venta desde el detalle de la cotización."
          />
        </div>
      } @else {
        <p class="texto-suave">
          Total del listado: <strong>{{ montoTotal() | quetzal }}</strong> en {{ d.total }} ventas.
        </p>
        <div class="tabla-contenedor">
          <table class="tabla">
            <thead>
              <tr>
                <th>Venta</th>
                <th>Fecha</th>
                <th>Cliente</th>
                <th class="oculto-movil">Vehículos</th>
                <th class="oculto-movil">Pago</th>
                <th class="numero">Total</th>
                @if (auth.esGerencia()) {
                  <th class="oculto-movil">Vendedor</th>
                }
              </tr>
            </thead>
            <tbody>
              @for (v of d.datos; track v.id) {
                <tr>
                  <td>
                    <a [routerLink]="['/ventas', v.id]" class="mono">{{ v.correlativo }}</a>
                  </td>
                  <td>{{ v.fecha | fechaGt }}</td>
                  <td>{{ v.clienteNombre }}</td>
                  <td class="oculto-movil">{{ v.vehiculos }}</td>
                  <td class="oculto-movil">{{ v.metodoPago }}</td>
                  <td class="numero">{{ v.total | quetzal }}</td>
                  @if (auth.esGerencia()) {
                    <td class="oculto-movil">{{ v.vendedorNombre }}</td>
                  }
                </tr>
              }
            </tbody>
          </table>
        </div>
        <app-paginacion
          [pagina]="d.pagina"
          [paginas]="d.paginas"
          [total]="d.total"
          [tamano]="d.tamano"
          (cambiar)="irAPagina($event)"
        />
      }
    }
  `,
})
export class VentasListaComponent extends ListaBase<Venta> {
  protected readonly ruta = '/ventas';
  readonly auth = inject(AuthService);
  readonly vendedores = toSignal(inject(VendedoresService).lista(), { initialValue: [] });
  readonly montoTotal = signal(0);

  override cargar(): void {
    this.cargando.set(true);
    this.error.set(null);
    this.api
      .get<Paginado<Venta> & { montoTotal: number }>(this.ruta, {
        ...this.filtros,
        q: this.q.trim(),
        pagina: this.pagina,
        tamano: this.tamano,
      })
      .subscribe({
        next: (d) => {
          this.datos.set(d);
          this.montoTotal.set(d.montoTotal);
          this.cargando.set(false);
        },
        error: (e) => {
          this.error.set(mensajeError(e));
          this.cargando.set(false);
        },
      });
  }
}

/** Detalle de una venta. */
@Component({
  selector: 'app-venta-detalle',
  imports: [RouterLink, FechaGtPipe, QuetzalPipe],
  template: `
    <div class="migas"><a routerLink="/ventas">Ventas</a> › Detalle</div>
    @if (error()) {
      <div class="aviso error">{{ error() }}</div>
    }
    @if (venta(); as v) {
      <div class="pagina-encabezado">
        <div>
          <h1 class="mono">{{ v.correlativo }}</h1>
          <p>Registrada el {{ v.fecha | fechaGt: true }} · {{ v.metodoPago }}</p>
        </div>
        <div class="acciones">
          <a [routerLink]="['/cotizaciones', v.cotizacionId]" class="btn"
            >Ver cotización {{ v.cotizacionCorrelativo }}</a
          >
        </div>
      </div>
      <div class="rejilla rejilla-2">
        <div class="tarjeta">
          <h2>Datos de la venta</h2>
          <dl class="datos-lista">
            <dt>Cliente</dt>
            <dd>
              <a [routerLink]="['/clientes', v.clienteId]">{{ v.clienteNombre }}</a>
            </dd>
            <dt>Vendedor</dt>
            <dd>{{ v.vendedorNombre }}</dd>
            <dt>Oportunidad</dt>
            <dd><a [routerLink]="['/oportunidades', v.oportunidadId]">Ver oportunidad (Ganado)</a></dd>
            <dt>Método de pago</dt>
            <dd>{{ v.metodoPago }}</dd>
            <dt>Total (IVA incluido)</dt>
            <dd>
              <strong>{{ v.total | quetzal }}</strong>
            </dd>
            <dt>Observaciones</dt>
            <dd>{{ v.observaciones || '—' }}</dd>
          </dl>
        </div>
        <div class="tarjeta">
          <h2>Vehículos vendidos</h2>
          <ul>
            @for (x of v.detalleVehiculos; track x.id) {
              <li>
                <a [routerLink]="['/vehiculos', x.id]">{{ x.marca }} {{ x.modelo }} {{ x.anio }}</a> ·
                {{ x.color }} · <span class="mono texto-pequeno">{{ x.vin }}</span> ·
                {{ x.precioFinal | quetzal }} (sin IVA)
              </li>
            }
          </ul>
        </div>
      </div>
    } @else if (!error()) {
      <div class="cargando">Cargando venta…</div>
    }
  `,
})
export class VentaDetalleComponent implements OnInit {
  readonly id = input.required<string>();
  private readonly api = inject(ApiService);
  readonly venta = signal<Venta | null>(null);
  readonly error = signal<string | null>(null);

  ngOnInit(): void {
    this.api.get<Venta>(`/ventas/${this.id()}`).subscribe({
      next: (v) => this.venta.set(v),
      error: (e) => this.error.set(mensajeError(e)),
    });
  }
}

export const VENTAS_RUTAS: Routes = [
  { path: '', title: 'Ventas — CRM AutoVentas GT', component: VentasListaComponent },
  { path: ':id', title: 'Venta — CRM AutoVentas GT', component: VentaDetalleComponent },
];
