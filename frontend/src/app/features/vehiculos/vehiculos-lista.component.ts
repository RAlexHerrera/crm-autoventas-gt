import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { CatalogosVehiculo, Vehiculo } from '../../core/modelos';
import { EstadoVacioComponent, InsigniaComponent, PaginacionComponent } from '../../shared/componentes';
import { ListaBase } from '../../shared/lista-base';
import { KilometrosPipe, QuetzalPipe } from '../../shared/pipes';

interface Inventario {
  porEstado: { estado: string; cantidad: number; valor: number }[];
  porCondicion: { condicion: string; cantidad: number }[];
}

/** Catálogo de vehículos con filtros y resumen de inventario (HU-07, HU-08). */
@Component({
  selector: 'app-vehiculos-lista',
  imports: [
    FormsModule,
    RouterLink,
    PaginacionComponent,
    EstadoVacioComponent,
    InsigniaComponent,
    QuetzalPipe,
    KilometrosPipe,
  ],
  template: `
    <div class="pagina-encabezado">
      <div>
        <h1>Vehículos</h1>
        <p>Catálogo e inventario de unidades nuevas y usadas.</p>
      </div>
      @if (auth.esGerencia()) {
        <div class="acciones">
          <a routerLink="/vehiculos/nuevo" class="btn btn-primario">+ Registrar vehículo</a>
        </div>
      }
    </div>

    @if (inventario(); as inv) {
      <div class="rejilla rejilla-kpi inventario">
        @for (e of inv.porEstado; track e.estado) {
          <button
            type="button"
            class="kpi boton-kpi"
            [class.seleccionado]="filtros['estado'] === e.estado"
            (click)="filtrarEstado(e.estado)"
          >
            <div class="etiqueta">{{ e.estado }}</div>
            <div class="valor">{{ e.cantidad }}</div>
            <div class="detalle">{{ e.valor | quetzal }}</div>
          </button>
        }
      </div>
    }

    <div class="barra-filtros">
      <div class="campo busqueda">
        <label for="q">Buscar</label>
        <input
          id="q"
          type="search"
          [(ngModel)]="q"
          (input)="buscar()"
          placeholder="Marca, modelo, versión, color o VIN"
        />
      </div>
      <div class="campo">
        <label for="marca">Marca</label>
        <select id="marca" [(ngModel)]="filtros['marca']" (change)="filtrar()">
          <option [ngValue]="undefined">Todas</option>
          @for (m of catalogos()?.marcas ?? []; track m) {
            <option [value]="m">{{ m }}</option>
          }
        </select>
      </div>
      <div class="campo">
        <label for="tipo">Tipo</label>
        <select id="tipo" [(ngModel)]="filtros['tipo']" (change)="filtrar()">
          <option [ngValue]="undefined">Todos</option>
          @for (t of catalogos()?.tipos ?? []; track t) {
            <option [value]="t">{{ t }}</option>
          }
        </select>
      </div>
      <div class="campo">
        <label for="condicion">Condición</label>
        <select id="condicion" [(ngModel)]="filtros['condicion']" (change)="filtrar()">
          <option [ngValue]="undefined">Nuevos y usados</option>
          <option value="Nuevo">Nuevo</option>
          <option value="Usado">Usado</option>
        </select>
      </div>
      <div class="campo">
        <label for="estado">Disponibilidad</label>
        <select id="estado" [(ngModel)]="filtros['estado']" (change)="filtrar()">
          <option [ngValue]="undefined">Todas</option>
          @for (e of catalogos()?.estados ?? []; track e) {
            <option [value]="e">{{ e }}</option>
          }
        </select>
      </div>
      <button
        type="button"
        class="btn"
        (click)="masFiltros.set(!masFiltros())"
        [attr.aria-expanded]="masFiltros()"
      >
        {{ masFiltros() ? 'Menos filtros' : 'Más filtros' }}
      </button>
      @if (hayFiltros()) {
        <button type="button" class="btn" (click)="limpiarFiltros()">Limpiar</button>
      }
    </div>

    @if (masFiltros()) {
      <div class="barra-filtros">
        <div class="campo">
          <label for="comb">Combustible</label>
          <select id="comb" [(ngModel)]="filtros['combustible']" (change)="filtrar()">
            <option [ngValue]="undefined">Todos</option>
            @for (c of catalogos()?.combustibles ?? []; track c) {
              <option [value]="c">{{ c }}</option>
            }
          </select>
        </div>
        <div class="campo">
          <label for="trans">Transmisión</label>
          <select id="trans" [(ngModel)]="filtros['transmision']" (change)="filtrar()">
            <option [ngValue]="undefined">Todas</option>
            @for (t of catalogos()?.transmisiones ?? []; track t) {
              <option [value]="t">{{ t }}</option>
            }
          </select>
        </div>
        <div class="campo">
          <label for="pmin">Precio mínimo (Q)</label>
          <input id="pmin" type="number" min="0" [(ngModel)]="filtros['precioMin']" (change)="filtrar()" />
        </div>
        <div class="campo">
          <label for="pmax">Precio máximo (Q)</label>
          <input id="pmax" type="number" min="0" [(ngModel)]="filtros['precioMax']" (change)="filtrar()" />
        </div>
        <div class="campo">
          <label for="amin">Año desde</label>
          <input id="amin" type="number" min="1980" [(ngModel)]="filtros['anioMin']" (change)="filtrar()" />
        </div>
        <div class="campo">
          <label for="orden">Ordenar por</label>
          <select id="orden" [(ngModel)]="filtros['orden']" (change)="filtrar()">
            <option [ngValue]="undefined">Más recientes</option>
            <option value="precio_asc">Precio: menor a mayor</option>
            <option value="precio_desc">Precio: mayor a menor</option>
            <option value="anio_desc">Año: más nuevo</option>
            <option value="marca">Marca y modelo</option>
          </select>
        </div>
      </div>
    }

    @if (error()) {
      <div class="aviso error">{{ error() }}</div>
    }

    @if (cargando() && !datos()) {
      <div class="cargando">Cargando vehículos…</div>
    } @else if (datos(); as d) {
      @if (d.total === 0) {
        <div class="tarjeta">
          @if (hayFiltros()) {
            <app-estado-vacio
              icono="🔎"
              titulo="Sin resultados"
              mensaje="Ningún vehículo cumple los filtros seleccionados."
            />
          } @else {
            <app-estado-vacio
              icono="🚗"
              titulo="El catálogo está vacío"
              mensaje="El gerente comercial puede registrar vehículos con su VIN y características técnicas."
            />
          }
        </div>
      } @else {
        <div class="tabla-contenedor">
          <table class="tabla">
            <thead>
              <tr>
                <th>Vehículo</th>
                <th class="oculto-movil">VIN</th>
                <th class="oculto-movil">Tipo</th>
                <th>Condición</th>
                <th class="oculto-movil">Kilometraje</th>
                <th class="numero">Precio</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              @for (v of d.datos; track v.id) {
                <tr>
                  <td>
                    <a [routerLink]="['/vehiculos', v.id]"
                      ><strong>{{ v.marca }} {{ v.modelo }}</strong> {{ v.anio }}</a
                    >
                    <div class="texto-pequeno texto-suave">
                      {{ v.version }} · {{ v.color }} · {{ v.transmision }} · {{ v.combustible }}
                    </div>
                  </td>
                  <td class="oculto-movil mono texto-pequeno">{{ v.vin }}</td>
                  <td class="oculto-movil">{{ v.tipo }}</td>
                  <td>{{ v.condicion }}</td>
                  <td class="oculto-movil">{{ v.kilometraje | kilometros }}</td>
                  <td class="numero">{{ v.precio | quetzal }}</td>
                  <td><app-insignia [valor]="v.estado" /></td>
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
  styles: `
    .inventario {
      margin-bottom: 1rem;
    }
    .boton-kpi {
      text-align: left;
      cursor: pointer;
      font: inherit;
    }
    .boton-kpi.seleccionado {
      outline: 3px solid var(--c-primario);
    }
  `,
})
export class VehiculosListaComponent extends ListaBase<Vehiculo> {
  protected readonly ruta = '/vehiculos';
  readonly auth = inject(AuthService);
  readonly catalogos = signal<CatalogosVehiculo | null>(null);
  readonly inventario = signal<Inventario | null>(null);
  readonly masFiltros = signal(false);

  constructor() {
    super();
    this.api.get<CatalogosVehiculo>('/vehiculos/catalogos').subscribe((c) => this.catalogos.set(c));
    this.api.get<Inventario>('/vehiculos/inventario').subscribe((i) => this.inventario.set(i));
  }

  filtrarEstado(estado: string): void {
    this.filtros['estado'] = this.filtros['estado'] === estado ? '' : estado;
    this.filtrar();
  }
}
