import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { AuthService } from '../../core/auth.service';
import { CLASIFICACIONES } from '../../core/catalogos';
import { Cliente } from '../../core/modelos';
import { EstadoVacioComponent, InsigniaComponent, PaginacionComponent } from '../../shared/componentes';
import { ListaBase } from '../../shared/lista-base';
import { VendedoresService } from '../../shared/vendedores.service';

/** Listado de clientes con búsqueda, filtros y paginación (HU-02). */
@Component({
  selector: 'app-clientes-lista',
  imports: [FormsModule, RouterLink, PaginacionComponent, EstadoVacioComponent, InsigniaComponent],
  template: `
    <div class="pagina-encabezado">
      <div>
        <h1>Clientes</h1>
        <p>{{ auth.esGerencia() ? 'Todos los clientes de la agencia.' : 'Clientes asignados a usted.' }}</p>
      </div>
      <div class="acciones">
        <a routerLink="/clientes/nuevo" class="btn btn-primario">+ Nuevo cliente</a>
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
          placeholder="Nombre, DPI, NIT, correo o teléfono"
        />
      </div>
      <div class="campo">
        <label for="clasif">Clasificación</label>
        <select id="clasif" [(ngModel)]="filtros['clasificacion']" (change)="filtrar()">
          <option [ngValue]="undefined">Todas</option>
          @for (c of clasificaciones; track c) {
            <option [value]="c">{{ c }}</option>
          }
        </select>
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
      <div class="aviso error">
        {{ error() }} <button class="btn btn-chico" (click)="cargar()">Reintentar</button>
      </div>
    }

    @if (cargando() && !datos()) {
      <div class="cargando">Cargando clientes…</div>
    } @else if (datos(); as d) {
      @if (d.total === 0) {
        <div class="tarjeta">
          @if (hayFiltros()) {
            <app-estado-vacio
              icono="🔎"
              titulo="Sin resultados"
              mensaje="Ningún cliente coincide con la búsqueda. Pruebe con otros términos o limpie los filtros."
            />
          } @else {
            <app-estado-vacio
              icono="👥"
              titulo="Aún no hay clientes"
              mensaje="Registre su primer cliente o convierta un prospecto al cerrar una venta."
            >
              <a routerLink="/clientes/nuevo" class="btn btn-primario">Registrar cliente</a>
            </app-estado-vacio>
          }
        </div>
      } @else {
        <div class="tabla-contenedor">
          <table class="tabla">
            <thead>
              <tr>
                <th>Cliente</th>
                <th class="oculto-movil">NIT</th>
                <th>Teléfono</th>
                <th class="oculto-movil">Correo</th>
                <th>Clasificación</th>
                <th class="numero">Compras</th>
                @if (auth.esGerencia()) {
                  <th class="oculto-movil">Vendedor</th>
                }
              </tr>
            </thead>
            <tbody>
              @for (c of d.datos; track c.id) {
                <tr>
                  <td>
                    <a [routerLink]="['/clientes', c.id]">{{ c.nombreCompleto }}</a>
                  </td>
                  <td class="oculto-movil">{{ c.nit }}</td>
                  <td>{{ c.telefono }}</td>
                  <td class="oculto-movil">{{ c.email || '—' }}</td>
                  <td><app-insignia [valor]="c.clasificacion" /></td>
                  <td class="numero">{{ c.compras }}</td>
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
export class ClientesListaComponent extends ListaBase<Cliente> {
  protected readonly ruta = '/clientes';
  readonly auth = inject(AuthService);
  readonly clasificaciones = CLASIFICACIONES;
  readonly vendedores = toSignal(inject(VendedoresService).lista(), { initialValue: [] });
}
