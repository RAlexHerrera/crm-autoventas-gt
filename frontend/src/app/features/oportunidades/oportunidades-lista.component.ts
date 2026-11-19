import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { AuthService } from '../../core/auth.service';
import { ETAPAS } from '../../core/catalogos';
import { Oportunidad, ResumenEtapa } from '../../core/modelos';
import { EstadoVacioComponent, InsigniaComponent, PaginacionComponent } from '../../shared/componentes';
import { ListaBase } from '../../shared/lista-base';
import { FechaGtPipe, QuetzalPipe } from '../../shared/pipes';
import { VendedoresService } from '../../shared/vendedores.service';

/** Embudo de ventas: vista tablero (kanban) por etapa y vista de tabla (HU-06). */
@Component({
  selector: 'app-oportunidades-lista',
  imports: [
    FormsModule,
    RouterLink,
    PaginacionComponent,
    EstadoVacioComponent,
    InsigniaComponent,
    QuetzalPipe,
    FechaGtPipe,
  ],
  template: `
    <div class="pagina-encabezado">
      <div>
        <h1>Oportunidades</h1>
        <p>Seguimiento de cada negocio por etapa del embudo de ventas.</p>
      </div>
      <div class="acciones">
        <div class="pestanas" role="tablist">
          <button
            type="button"
            role="tab"
            [class.activa]="vista() === 'tablero'"
            [attr.aria-selected]="vista() === 'tablero'"
            (click)="cambiarVista('tablero')"
          >
            Tablero
          </button>
          <button
            type="button"
            role="tab"
            [class.activa]="vista() === 'tabla'"
            [attr.aria-selected]="vista() === 'tabla'"
            (click)="cambiarVista('tabla')"
          >
            Tabla
          </button>
        </div>
        <a routerLink="/oportunidades/nueva" class="btn btn-primario">+ Nueva oportunidad</a>
      </div>
    </div>

    <div class="rejilla rejilla-kpi resumen">
      @for (r of resumen(); track r.etapa) {
        <button
          type="button"
          class="kpi boton-kpi"
          [class.seleccionado]="filtros['etapa'] === r.etapa"
          (click)="filtrarEtapa(r.etapa)"
        >
          <div class="etiqueta">{{ r.etapa }}</div>
          <div class="valor">{{ r.cantidad }}</div>
          <div class="detalle">{{ r.monto | quetzal }}</div>
        </button>
      }
    </div>

    <div class="barra-filtros">
      <div class="campo busqueda">
        <label for="q">Buscar</label>
        <input
          id="q"
          type="search"
          [(ngModel)]="q"
          (input)="buscar()"
          placeholder="Título o nombre del contacto"
        />
      </div>
      <div class="campo">
        <label for="etapa">Etapa</label>
        <select id="etapa" [(ngModel)]="filtros['etapa']" (change)="filtrar()">
          <option [ngValue]="undefined">Todas</option>
          @for (e of etapas; track e) {
            <option [value]="e">{{ e }}</option>
          }
        </select>
      </div>
      @if (auth.esGerencia()) {
        <div class="campo">
          <label for="vend">Vendedor</label>
          <select id="vend" [(ngModel)]="filtros['vendedorId']" (change)="filtrar(); cargarResumen()">
            <option [ngValue]="undefined">Todos</option>
            @for (v of vendedores(); track v.id) {
              <option [value]="v.id">{{ v.nombre }}</option>
            }
          </select>
        </div>
      }
      @if (hayFiltros()) {
        <button type="button" class="btn" (click)="limpiarFiltros(); cargarResumen()">Limpiar filtros</button>
      }
    </div>

    @if (error()) {
      <div class="aviso error">{{ error() }}</div>
    }

    @if (cargando() && !datos()) {
      <div class="cargando">Cargando oportunidades…</div>
    } @else if (datos(); as d) {
      @if (d.total === 0) {
        <div class="tarjeta">
          <app-estado-vacio
            icono="📈"
            titulo="No hay oportunidades"
            mensaje="Cree una oportunidad desde un prospecto o cliente para comenzar a darle seguimiento."
          >
            <a routerLink="/oportunidades/nueva" class="btn btn-primario">Crear oportunidad</a>
          </app-estado-vacio>
        </div>
      } @else if (vista() === 'tablero') {
        <div class="kanban">
          @for (col of columnas(); track col.etapa) {
            <section class="kanban-columna" [attr.aria-label]="col.etapa">
              <h3>
                <span>{{ col.etapa }}</span><span>{{ col.items.length }}</span>
              </h3>
              @for (o of col.items; track o.id) {
                <a
                  class="kanban-tarjeta"
                  [routerLink]="['/oportunidades', o.id]"
                  [style.border-left-color]="colorColumna(col.etapa)"
                >
                  <strong>{{ o.titulo }}</strong>
                  <span class="texto-pequeno">{{ o.contactoNombre }} ({{ o.contactoTipo }})</span><br />
                  <span class="texto-pequeno"
                    >{{ o.montoEstimado | quetzal }} · {{ o.fechaCierreEstimada | fechaGt }}</span
                  >
                  @if (auth.esGerencia()) {
                    <br /><span class="texto-pequeno texto-suave">{{ o.vendedorNombre }}</span>
                  }
                </a>
              } @empty {
                <p class="texto-pequeno texto-suave">Sin oportunidades</p>
              }
            </section>
          }
        </div>
        @if (d.total > d.datos.length) {
          <p class="texto-suave texto-pequeno">
            Mostrando {{ d.datos.length }} de {{ d.total }}. Use los filtros o la vista de tabla para ver el
            resto.
          </p>
        }
      } @else {
        <div class="tabla-contenedor">
          <table class="tabla">
            <thead>
              <tr>
                <th>Oportunidad</th>
                <th>Contacto</th>
                <th class="oculto-movil">Vehículo</th>
                <th>Etapa</th>
                <th class="numero">Monto</th>
                <th class="oculto-movil">Cierre estimado</th>
                @if (auth.esGerencia()) {
                  <th class="oculto-movil">Vendedor</th>
                }
              </tr>
            </thead>
            <tbody>
              @for (o of d.datos; track o.id) {
                <tr>
                  <td>
                    <a [routerLink]="['/oportunidades', o.id]">{{ o.titulo }}</a>
                  </td>
                  <td>
                    {{ o.contactoNombre }}
                    <span class="texto-suave texto-pequeno">({{ o.contactoTipo }})</span>
                  </td>
                  <td class="oculto-movil">{{ o.vehiculoInteres || '—' }}</td>
                  <td><app-insignia [valor]="o.etapa" /></td>
                  <td class="numero">{{ o.montoEstimado | quetzal }}</td>
                  <td class="oculto-movil">{{ o.fechaCierreEstimada | fechaGt }}</td>
                  @if (auth.esGerencia()) {
                    <td class="oculto-movil">{{ o.vendedorNombre }}</td>
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
  styles: `
    .resumen {
      margin-bottom: 1rem;
      grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
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
export class OportunidadesListaComponent extends ListaBase<Oportunidad> {
  protected readonly ruta = '/oportunidades';
  readonly auth = inject(AuthService);
  readonly etapas = ETAPAS;
  readonly vendedores = toSignal(inject(VendedoresService).lista(), { initialValue: [] });
  readonly vista = signal<'tablero' | 'tabla'>('tablero');
  readonly resumen = signal<ResumenEtapa[]>([]);

  readonly columnas = computed(() => {
    const datos = this.datos()?.datos ?? [];
    return ETAPAS.map((etapa) => ({ etapa, items: datos.filter((o) => o.etapa === etapa) }));
  });

  constructor() {
    super();
    this.tamano = 100; // el tablero muestra hasta 100 tarjetas
    this.cargarResumen();
  }

  cargarResumen(): void {
    this.api
      .get<ResumenEtapa[]>('/oportunidades/resumen-etapas', { vendedorId: this.filtros['vendedorId'] })
      .subscribe({ next: (r) => this.resumen.set(r) });
  }

  cambiarVista(v: 'tablero' | 'tabla'): void {
    this.vista.set(v);
    this.tamano = v === 'tablero' ? 100 : 10;
    this.filtrar();
  }

  filtrarEtapa(etapa: string): void {
    this.filtros['etapa'] = this.filtros['etapa'] === etapa ? '' : etapa;
    this.filtrar();
  }

  colorColumna(etapa: string): string {
    return (
      { Ganado: '#16a34a', Perdido: '#dc2626', Negociación: '#f59e0b', Cotización: '#1d4ed8' }[etapa] ??
      '#64748b'
    );
  }
}
