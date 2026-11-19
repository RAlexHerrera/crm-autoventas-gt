import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { ApiService, mensajeError } from '../../core/api.service';
import { GraficaComponent, SerieGrafica } from '../../shared/grafica.component';
import { InsigniaComponent } from '../../shared/componentes';
import { FechaGtPipe, PorcentajePipe, QuetzalPipe } from '../../shared/pipes';
import { VendedoresService } from '../../shared/vendedores.service';

type Pestana = 'ventas' | 'vendedores' | 'conversion' | 'vehiculos' | 'funnel' | 'clasificacion';

interface VentasPeriodo {
  serie: { periodo: string; cantidad: number; monto: number }[];
  totales: { cantidad: number; monto: number; unidades: number };
}
interface Vendedores {
  vendedores: {
    vendedorId: number;
    vendedor: string;
    activo: boolean;
    ventas: number;
    monto: number;
    ticketPromedio: number;
    cotizaciones: number;
    oportunidadesGanadas: number;
    oportunidadesCerradas: number;
    oportunidadesAbiertas: number;
    prospectosNuevos: number;
    tasaCierre: number;
  }[];
}
interface Conversion {
  total: number;
  convertidos: number;
  tasa: number;
  porFuente: {
    fuente: string;
    total: number;
    convertidos: number;
    descartados: number;
    enProceso: number;
    tasa: number;
  }[];
}
interface MasVendidos {
  vehiculos: { vehiculo: string; unidades: number; monto: number }[];
}
interface Funnel {
  etapas: { etapa: string; cantidad: number; monto: number }[];
  acumulado: { etapa: string; cantidad: number }[];
  total: number;
  ganadas: number;
  perdidas: number;
  tasaCierre: number;
}
interface Clasificacion {
  resumen: { clasificacion: string; clientes: number; monto: number; compras: number }[];
  clientes: {
    id: number;
    cliente: string;
    clasificacion: string;
    sugerida: string;
    compras: number;
    monto: number;
    vendedor: string;
    ultimaCompra: string | null;
  }[];
  discrepancias: { id: number }[];
}

/** Reportes gerenciales con filtros y gráficas (HU-11, HU-12, HU-13, HU-15). */
@Component({
  selector: 'app-reportes',
  imports: [
    FormsModule,
    RouterLink,
    GraficaComponent,
    InsigniaComponent,
    QuetzalPipe,
    PorcentajePipe,
    FechaGtPipe,
  ],
  template: `
    <div class="pagina-encabezado">
      <div>
        <h1>Reportes</h1>
        <p>Indicadores comerciales para la toma de decisiones. Seleccione el período y el reporte.</p>
      </div>
      <button type="button" class="btn" (click)="imprimir()">🖨 Imprimir</button>
    </div>

    <form class="barra-filtros tarjeta" (ngSubmit)="cargar()">
      <div class="campo">
        <label for="desde">Desde</label>
        <input id="desde" name="desde" type="date" [(ngModel)]="desde" />
      </div>
      <div class="campo">
        <label for="hasta">Hasta</label>
        <input id="hasta" name="hasta" type="date" [(ngModel)]="hasta" />
      </div>
      @if (pestana() !== 'vendedores') {
        <div class="campo">
          <label for="vend">Vendedor</label>
          <select id="vend" name="vend" [(ngModel)]="vendedorId">
            <option value="">Todos</option>
            @for (v of vendedores(); track v.id) {
              <option [value]="v.id">{{ v.nombre }}</option>
            }
          </select>
        </div>
      }
      @if (pestana() === 'ventas') {
        <div class="campo">
          <label for="agr">Agrupar por</label>
          <select id="agr" name="agr" [(ngModel)]="agrupacion">
            <option value="mes">Mes</option>
            <option value="dia">Día</option>
          </select>
        </div>
      }
      <button type="submit" class="btn btn-primario">Generar</button>
      <span class="texto-pequeno texto-suave">Sin fechas se usan los últimos 12 meses.</span>
    </form>

    <div class="pestanas" role="tablist">
      @for (p of pestanas; track p.id) {
        <button
          type="button"
          role="tab"
          [class.activa]="pestana() === p.id"
          [attr.aria-selected]="pestana() === p.id"
          (click)="seleccionar(p.id)"
        >
          {{ p.texto }}
        </button>
      }
    </div>

    @if (error()) {
      <div class="aviso error">{{ error() }}</div>
    }
    @if (cargando()) {
      <div class="cargando">Generando reporte…</div>
    }

    @switch (pestana()) {
      @case ('ventas') {
        @if (ventas(); as r) {
          <div class="rejilla rejilla-kpi">
            <div class="kpi">
              <div class="etiqueta">Ventas</div>
              <div class="valor">{{ r.totales.cantidad }}</div>
            </div>
            <div class="kpi">
              <div class="etiqueta">Monto total</div>
              <div class="valor">{{ r.totales.monto | quetzal }}</div>
            </div>
            <div class="kpi">
              <div class="etiqueta">Unidades</div>
              <div class="valor">{{ r.totales.unidades }}</div>
            </div>
            <div class="kpi">
              <div class="etiqueta">Ticket promedio</div>
              <div class="valor">
                {{ (r.totales.cantidad ? r.totales.monto / r.totales.cantidad : 0) | quetzal }}
              </div>
            </div>
          </div>
          <div class="tarjeta separado">
            <h2>Ventas por período</h2>
            <app-grafica
              tipo="bar"
              [etiquetas]="ventasEtiquetas()"
              [series]="ventasSeries()"
              descripcion="Ventas por período"
            />
          </div>
          <div class="tabla-contenedor">
            <table class="tabla">
              <thead>
                <tr>
                  <th>Período</th>
                  <th class="numero">Ventas</th>
                  <th class="numero">Monto</th>
                </tr>
              </thead>
              <tbody>
                @for (f of r.serie; track f.periodo) {
                  <tr>
                    <td>{{ f.periodo }}</td>
                    <td class="numero">{{ f.cantidad }}</td>
                    <td class="numero">{{ f.monto | quetzal }}</td>
                  </tr>
                } @empty {
                  <tr>
                    <td colspan="3">Sin ventas en el período.</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      }
      @case ('vendedores') {
        @if (vendedoresReporte(); as r) {
          <div class="tarjeta">
            <h2>Monto vendido por vendedor</h2>
            <app-grafica
              tipo="barh"
              [etiquetas]="vendEtiquetas()"
              [series]="vendSeries()"
              [alto]="240"
              descripcion="Monto vendido por vendedor"
            />
          </div>
          <div class="tabla-contenedor">
            <table class="tabla">
              <thead>
                <tr>
                  <th>Vendedor</th>
                  <th class="numero">Ventas</th>
                  <th class="numero">Monto</th>
                  <th class="numero">Ticket prom.</th>
                  <th class="numero">Cotizaciones</th>
                  <th class="numero">Ganadas / cerradas</th>
                  <th class="numero">Tasa cierre</th>
                  <th class="numero">Oport. abiertas</th>
                  <th class="numero">Prospectos nuevos</th>
                </tr>
              </thead>
              <tbody>
                @for (v of r.vendedores; track v.vendedorId) {
                  <tr>
                    <td>
                      {{ v.vendedor }}
                      @if (!v.activo) {
                        <app-insignia valor="Inactivo" />
                      }
                    </td>
                    <td class="numero">{{ v.ventas }}</td>
                    <td class="numero">{{ v.monto | quetzal }}</td>
                    <td class="numero">{{ v.ticketPromedio | quetzal }}</td>
                    <td class="numero">{{ v.cotizaciones }}</td>
                    <td class="numero">{{ v.oportunidadesGanadas }} / {{ v.oportunidadesCerradas }}</td>
                    <td class="numero">{{ v.tasaCierre | porcentaje }}</td>
                    <td class="numero">{{ v.oportunidadesAbiertas }}</td>
                    <td class="numero">{{ v.prospectosNuevos }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      }
      @case ('conversion') {
        @if (conversion(); as r) {
          <div class="rejilla rejilla-kpi">
            <div class="kpi">
              <div class="etiqueta">Prospectos registrados</div>
              <div class="valor">{{ r.total }}</div>
            </div>
            <div class="kpi">
              <div class="etiqueta">Convertidos en clientes</div>
              <div class="valor">{{ r.convertidos }}</div>
            </div>
            <div class="kpi">
              <div class="etiqueta">Tasa de conversión</div>
              <div class="valor">{{ r.tasa | porcentaje }}</div>
            </div>
          </div>
          <div class="tarjeta separado">
            <h2>Conversión por fuente</h2>
            <app-grafica
              tipo="bar"
              [etiquetas]="convEtiquetas()"
              [series]="convSeries()"
              descripcion="Prospectos y conversiones por fuente"
            />
          </div>
          <div class="tabla-contenedor">
            <table class="tabla">
              <thead>
                <tr>
                  <th>Fuente</th>
                  <th class="numero">Prospectos</th>
                  <th class="numero">Convertidos</th>
                  <th class="numero">En proceso</th>
                  <th class="numero">Descartados</th>
                  <th class="numero">Tasa</th>
                </tr>
              </thead>
              <tbody>
                @for (f of r.porFuente; track f.fuente) {
                  <tr>
                    <td>{{ f.fuente }}</td>
                    <td class="numero">{{ f.total }}</td>
                    <td class="numero">{{ f.convertidos }}</td>
                    <td class="numero">{{ f.enProceso }}</td>
                    <td class="numero">{{ f.descartados }}</td>
                    <td class="numero">{{ f.tasa | porcentaje }}</td>
                  </tr>
                } @empty {
                  <tr>
                    <td colspan="6">Sin prospectos en el período.</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      }
      @case ('vehiculos') {
        @if (masVendidos(); as r) {
          <div class="tarjeta">
            <h2>Vehículos más vendidos</h2>
            @if (r.vehiculos.length) {
              <app-grafica
                tipo="barh"
                [etiquetas]="mvEtiquetas()"
                [series]="mvSeries()"
                descripcion="Vehículos más vendidos por unidades"
              />
            }
          </div>
          <div class="tabla-contenedor">
            <table class="tabla">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Vehículo</th>
                  <th class="numero">Unidades</th>
                  <th class="numero">Monto (sin IVA)</th>
                </tr>
              </thead>
              <tbody>
                @for (v of r.vehiculos; track v.vehiculo; let i = $index) {
                  <tr>
                    <td>{{ i + 1 }}</td>
                    <td>{{ v.vehiculo }}</td>
                    <td class="numero">{{ v.unidades }}</td>
                    <td class="numero">{{ v.monto | quetzal }}</td>
                  </tr>
                } @empty {
                  <tr>
                    <td colspan="4">Sin ventas en el período.</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      }
      @case ('funnel') {
        @if (funnel(); as r) {
          <div class="rejilla rejilla-kpi">
            <div class="kpi">
              <div class="etiqueta">Oportunidades creadas</div>
              <div class="valor">{{ r.total }}</div>
            </div>
            <div class="kpi">
              <div class="etiqueta">Ganadas</div>
              <div class="valor">{{ r.ganadas }}</div>
            </div>
            <div class="kpi">
              <div class="etiqueta">Perdidas</div>
              <div class="valor">{{ r.perdidas }}</div>
            </div>
            <div class="kpi">
              <div class="etiqueta">Tasa de cierre</div>
              <div class="valor">{{ r.tasaCierre | porcentaje }}</div>
            </div>
          </div>
          <div class="rejilla rejilla-2 separado">
            <div class="tarjeta">
              <h2>Embudo (alcanzaron la etapa)</h2>
              <app-grafica
                tipo="barh"
                [etiquetas]="funEtiquetas()"
                [series]="funSeries()"
                descripcion="Embudo de ventas acumulado"
              />
            </div>
            <div class="tarjeta">
              <h2>Distribución actual por etapa</h2>
              <div class="tabla-contenedor">
                <table class="tabla">
                  <thead>
                    <tr>
                      <th>Etapa</th>
                      <th class="numero">Cantidad</th>
                      <th class="numero">Monto estimado</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (e of r.etapas; track e.etapa) {
                      <tr>
                        <td><app-insignia [valor]="e.etapa" /></td>
                        <td class="numero">{{ e.cantidad }}</td>
                        <td class="numero">{{ e.monto | quetzal }}</td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        }
      }
      @case ('clasificacion') {
        @if (clasificacion(); as r) {
          <div class="rejilla rejilla-2">
            <div class="tarjeta">
              <h2>Clientes por clasificación</h2>
              <app-grafica
                tipo="doughnut"
                [etiquetas]="clEtiquetas()"
                [series]="clSeries()"
                [alto]="240"
                descripcion="Clientes por clasificación"
              />
            </div>
            <div class="tarjeta">
              <h2>Regla de clasificación automática</h2>
              <ul class="texto-pequeno">
                <li><strong>Nuevo:</strong> sin compras.</li>
                <li><strong>Regular:</strong> 1 compra.</li>
                <li><strong>Frecuente:</strong> 2 o más compras.</li>
                <li><strong>VIP:</strong> compras acumuladas ≥ Q500,000 (o asignado manualmente).</li>
                <li><strong>Inactivo:</strong> más de un año sin compras desde su registro.</li>
              </ul>
              <p class="texto-pequeno texto-suave">
                La clasificación se actualiza al registrar cada venta. La columna «Sugerida» señala
                diferencias para revisión.
              </p>
              @if (r.discrepancias.length) {
                <div class="aviso alerta">
                  {{ r.discrepancias.length }} cliente(s) con clasificación distinta a la sugerida.
                </div>
              }
            </div>
          </div>
          <div class="tabla-contenedor separado">
            <table class="tabla">
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Clasificación</th>
                  <th>Sugerida</th>
                  <th class="numero">Compras</th>
                  <th class="numero">Monto</th>
                  <th>Última compra</th>
                  <th class="oculto-movil">Vendedor</th>
                </tr>
              </thead>
              <tbody>
                @for (c of r.clientes; track c.id) {
                  <tr>
                    <td>
                      <a [routerLink]="['/clientes', c.id]">{{ c.cliente }}</a>
                    </td>
                    <td><app-insignia [valor]="c.clasificacion" /></td>
                    <td>
                      @if (c.sugerida !== c.clasificacion) {
                        <app-insignia [valor]="c.sugerida" />
                      } @else {
                        <span class="texto-suave">—</span>
                      }
                    </td>
                    <td class="numero">{{ c.compras }}</td>
                    <td class="numero">{{ c.monto | quetzal }}</td>
                    <td>{{ c.ultimaCompra | fechaGt }}</td>
                    <td class="oculto-movil">{{ c.vendedor }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      }
    }
  `,
  styles: `
    .separado {
      margin-top: 1rem;
    }
    @media print {
      .barra-filtros,
      .pestanas,
      button {
        display: none !important;
      }
    }
  `,
})
export class ReportesComponent {
  private readonly api = inject(ApiService);
  readonly vendedores = toSignal(inject(VendedoresService).lista(), { initialValue: [] });

  readonly pestanas: { id: Pestana; texto: string }[] = [
    { id: 'ventas', texto: 'Ventas por período' },
    { id: 'vendedores', texto: 'Rendimiento por vendedor' },
    { id: 'conversion', texto: 'Conversión de prospectos' },
    { id: 'vehiculos', texto: 'Vehículos más vendidos' },
    { id: 'funnel', texto: 'Funnel de ventas' },
    { id: 'clasificacion', texto: 'Clasificación de clientes' },
  ];
  readonly pestana = signal<Pestana>('ventas');
  readonly cargando = signal(false);
  readonly error = signal<string | null>(null);

  desde = '';
  hasta = '';
  vendedorId = '';
  agrupacion = 'mes';

  readonly ventas = signal<VentasPeriodo | null>(null);
  readonly vendedoresReporte = signal<Vendedores | null>(null);
  readonly conversion = signal<Conversion | null>(null);
  readonly masVendidos = signal<MasVendidos | null>(null);
  readonly funnel = signal<Funnel | null>(null);
  readonly clasificacion = signal<Clasificacion | null>(null);

  readonly ventasEtiquetas = computed(() => (this.ventas()?.serie ?? []).map((s) => s.periodo));
  readonly ventasSeries = computed<SerieGrafica[]>(() => {
    const s = this.ventas()?.serie ?? [];
    return [
      { nombre: 'Ventas', datos: s.map((x) => x.cantidad), color: '#93c5fd' },
      { nombre: 'Monto (Q)', datos: s.map((x) => x.monto), color: '#1d4ed8', moneda: true, tipo: 'line' },
    ];
  });
  readonly vendEtiquetas = computed(() =>
    (this.vendedoresReporte()?.vendedores ?? []).map((v) => v.vendedor),
  );
  readonly vendSeries = computed<SerieGrafica[]>(() => [
    {
      nombre: 'Monto',
      datos: (this.vendedoresReporte()?.vendedores ?? []).map((v) => v.monto),
      moneda: true,
      color: '#16a34a',
    },
  ]);
  readonly convEtiquetas = computed(() => (this.conversion()?.porFuente ?? []).map((f) => f.fuente));
  readonly convSeries = computed<SerieGrafica[]>(() => [
    {
      nombre: 'Prospectos',
      datos: (this.conversion()?.porFuente ?? []).map((f) => f.total),
      color: '#93c5fd',
    },
    {
      nombre: 'Convertidos',
      datos: (this.conversion()?.porFuente ?? []).map((f) => f.convertidos),
      color: '#16a34a',
    },
  ]);
  readonly mvEtiquetas = computed(() => (this.masVendidos()?.vehiculos ?? []).map((v) => v.vehiculo));
  readonly mvSeries = computed<SerieGrafica[]>(() => [
    {
      nombre: 'Unidades',
      datos: (this.masVendidos()?.vehiculos ?? []).map((v) => v.unidades),
      color: '#f59e0b',
    },
  ]);
  readonly funEtiquetas = computed(() => (this.funnel()?.acumulado ?? []).map((e) => e.etapa));
  readonly funSeries = computed<SerieGrafica[]>(() => [
    {
      nombre: 'Oportunidades',
      datos: (this.funnel()?.acumulado ?? []).map((e) => e.cantidad),
      color: '#1d4ed8',
    },
  ]);
  readonly clEtiquetas = computed(() => (this.clasificacion()?.resumen ?? []).map((c) => c.clasificacion));
  readonly clSeries = computed<SerieGrafica[]>(() => [
    { nombre: 'Clientes', datos: (this.clasificacion()?.resumen ?? []).map((c) => c.clientes) },
  ]);

  constructor() {
    this.cargar();
  }

  seleccionar(p: Pestana): void {
    this.pestana.set(p);
    this.cargar();
  }

  imprimir(): void {
    window.print();
  }

  cargar(): void {
    if (this.desde && this.hasta && this.desde > this.hasta) {
      this.error.set('La fecha inicial no puede ser posterior a la final.');
      return;
    }
    const rutas: Record<Pestana, string> = {
      ventas: '/reportes/ventas-periodo',
      vendedores: '/reportes/rendimiento-vendedores',
      conversion: '/reportes/conversion-prospectos',
      vehiculos: '/reportes/vehiculos-mas-vendidos',
      funnel: '/reportes/funnel',
      clasificacion: '/reportes/clasificacion-clientes',
    };
    const destino = {
      ventas: this.ventas,
      vendedores: this.vendedoresReporte,
      conversion: this.conversion,
      vehiculos: this.masVendidos,
      funnel: this.funnel,
      clasificacion: this.clasificacion,
    } as Record<Pestana, { set: (v: never) => void }>;
    const p = this.pestana();
    this.cargando.set(true);
    this.error.set(null);
    this.api
      .get<never>(rutas[p], {
        desde: this.desde,
        hasta: this.hasta,
        vendedorId: p === 'vendedores' ? null : this.vendedorId,
        agrupacion: p === 'ventas' ? this.agrupacion : null,
      })
      .subscribe({
        next: (r) => {
          destino[p].set(r);
          this.cargando.set(false);
        },
        error: (e) => {
          this.error.set(mensajeError(e, 'No se pudo generar el reporte.'));
          this.cargando.set(false);
        },
      });
  }
}
