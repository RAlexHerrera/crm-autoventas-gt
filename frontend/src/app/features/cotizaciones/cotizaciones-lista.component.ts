import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { AuthService } from '../../core/auth.service';
import { ESTADOS_COTIZACION } from '../../core/catalogos';
import { Cotizacion } from '../../core/modelos';
import { EstadoVacioComponent, InsigniaComponent, PaginacionComponent } from '../../shared/componentes';
import { ListaBase } from '../../shared/lista-base';
import { FechaGtPipe, QuetzalPipe } from '../../shared/pipes';
import { VendedoresService } from '../../shared/vendedores.service';

/** Listado y seguimiento de cotizaciones (HU-09). */
@Component({
  selector: 'app-cotizaciones-lista',
  imports: [
    FormsModule,
    RouterLink,
    PaginacionComponent,
    EstadoVacioComponent,
    InsigniaComponent,
    FechaGtPipe,
    QuetzalPipe,
  ],
  template: `
    <div class="pagina-encabezado">
      <div>
        <h1>Cotizaciones</h1>
        <p>Ofertas enviadas a clientes y prospectos. Los totales incluyen IVA del 12 %.</p>
      </div>
      <div class="acciones">
        <a routerLink="/cotizaciones/nueva" class="btn btn-primario">+ Nueva cotización</a>
      </div>
    </div>

    <div class="barra-filtros">
      <div class="campo busqueda">
        <label for="q">Buscar</label>
        <input
          id="q"
          type="search"
          [(ngModel)]="q"
          (input)="buscar()"
          placeholder="Correlativo, contacto u oportunidad"
        />
      </div>
      <div class="campo">
        <label for="estado">Estado</label>
        <select id="estado" [(ngModel)]="filtros['estado']" (change)="filtrar()">
          <option [ngValue]="undefined">Todos</option>
          @for (e of estados; track e) {
            <option [value]="e">{{ e }}</option>
          }
        </select>
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
      <div class="cargando">Cargando cotizaciones…</div>
    } @else if (datos(); as d) {
      @if (d.total === 0) {
        <div class="tarjeta">
          @if (hayFiltros()) {
            <app-estado-vacio
              icono="🔎"
              titulo="Sin resultados"
              mensaje="Ninguna cotización coincide con los filtros."
            />
          } @else {
            <app-estado-vacio
              icono="🧾"
              titulo="No hay cotizaciones"
              mensaje="Las cotizaciones se crean a partir de una oportunidad abierta y vehículos disponibles."
            >
              <a routerLink="/cotizaciones/nueva" class="btn btn-primario">Crear cotización</a>
            </app-estado-vacio>
          }
        </div>
      } @else {
        <div class="tabla-contenedor">
          <table class="tabla">
            <thead>
              <tr>
                <th>Correlativo</th>
                <th>Contacto</th>
                <th class="oculto-movil">Fecha</th>
                <th class="oculto-movil">Vigencia</th>
                <th>Estado</th>
                <th class="numero">Total</th>
                @if (auth.esGerencia()) {
                  <th class="oculto-movil">Vendedor</th>
                }
              </tr>
            </thead>
            <tbody>
              @for (c of d.datos; track c.id) {
                <tr>
                  <td>
                    <a [routerLink]="['/cotizaciones', c.id]" class="mono">{{ c.correlativo }}</a>
                  </td>
                  <td>
                    {{ c.contactoNombre }}
                    <span class="texto-suave texto-pequeno">({{ c.contactoTipo }})</span>
                  </td>
                  <td class="oculto-movil">{{ c.fecha | fechaGt }}</td>
                  <td class="oculto-movil">{{ c.vigenciaHasta | fechaGt }}</td>
                  <td><app-insignia [valor]="c.estado" /></td>
                  <td class="numero">{{ c.total | quetzal }}</td>
                  @if (auth.esGerencia()) {
                    <td class="oculto-movil">{{ c.vendedorNombre }}</td>
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
export class CotizacionesListaComponent extends ListaBase<Cotizacion> {
  protected readonly ruta = '/cotizaciones';
  readonly auth = inject(AuthService);
  readonly estados = ESTADOS_COTIZACION;
  readonly vendedores = toSignal(inject(VendedoresService).lista(), { initialValue: [] });
}
