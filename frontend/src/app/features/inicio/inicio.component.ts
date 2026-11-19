import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService, mensajeError } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { GraficaComponent, SerieGrafica } from '../../shared/grafica.component';
import { InsigniaComponent } from '../../shared/componentes';
import { FechaGtPipe, PorcentajePipe, QuetzalPipe } from '../../shared/pipes';

interface Dashboard {
  desde: string;
  hasta: string;
  kpis: {
    ventasCantidad: number;
    ventasMonto: number;
    unidadesVendidas: number;
    ticketPromedio: number;
    tasaConversion: number;
    tasaCierre: number;
    oportunidadesAbiertas: number;
    montoPipeline: number;
    cotizacionesAbiertas: number;
    prospectosNuevos: number;
    clientes: number;
    vehiculosDisponibles: number;
    valorInventario: number;
  };
  ventasPorMes: { periodo: string; cantidad: number; monto: number }[];
  funnel: {
    etapas: { etapa: string; cantidad: number; monto: number }[];
    acumulado: { etapa: string; cantidad: number }[];
  };
  topVehiculos: { vehiculo: string; unidades: number; monto: number }[];
  vendedores: {
    vendedorId: number;
    vendedor: string;
    ventas: number;
    monto: number;
    tasaCierre: number;
    oportunidadesAbiertas: number;
  }[];
  clasificacionClientes: { clasificacion: string; clientes: number; monto: number }[];
  proximosCierres: {
    id: number;
    titulo: string;
    etapa: string;
    montoEstimado: number;
    fechaCierreEstimada: string | null;
    contactoNombre: string;
    vendedorNombre: string;
  }[];
}

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

/**
 * Inicio. Gerente y Administrador ven el dashboard general (HU-11/12/13/15);
 * el vendedor ve su panel con los mismos indicadores limitados a sus datos.
 */
@Component({
  selector: 'app-inicio',
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
        <h1>Hola, {{ primerNombre() }} 👋</h1>
        <p>
          {{ auth.esGerencia() ? 'Dashboard comercial de toda la agencia' : 'Su panel personal de ventas' }}
        </p>
      </div>
      <form class="acciones filtros" (ngSubmit)="cargar()">
        <label class="campo">
          <span class="texto-pequeno">Desde</span>
          <input type="date" name="desde" [(ngModel)]="desde" />
        </label>
        <label class="campo">
          <span class="texto-pequeno">Hasta</span>
          <input type="date" name="hasta" [(ngModel)]="hasta" />
        </label>
        <button type="submit" class="btn btn-primario">Aplicar</button>
      </form>
    </div>

    @if (error()) {
      <div class="aviso error">{{ error() }}</div>
    }
    @if (cargando() && !datos()) {
      <div class="cargando">Cargando indicadores…</div>
    }

    @if (datos(); as d) {
      <p class="texto-suave texto-pequeno">Período: {{ d.desde | fechaGt }} al {{ d.hasta | fechaGt }}</p>
      <section class="rejilla rejilla-kpi" aria-label="Indicadores clave">
        <div class="kpi">
          <div class="etiqueta">Ventas del período</div>
          <div class="valor">{{ d.kpis.ventasMonto | quetzal }}</div>
          <div class="detalle">
            {{ d.kpis.ventasCantidad }} ventas · {{ d.kpis.unidadesVendidas }} unidades
          </div>
        </div>
        <div class="kpi">
          <div class="etiqueta">Ticket promedio</div>
          <div class="valor">{{ d.kpis.ticketPromedio | quetzal }}</div>
          <div class="detalle">Monto promedio por venta</div>
        </div>
        <div class="kpi">
          <div class="etiqueta">Conversión de prospectos</div>
          <div class="valor">{{ d.kpis.tasaConversion | porcentaje }}</div>
          <div class="detalle">{{ d.kpis.prospectosNuevos }} prospectos nuevos</div>
        </div>
        <div class="kpi">
          <div class="etiqueta">Tasa de cierre</div>
          <div class="valor">{{ d.kpis.tasaCierre | porcentaje }}</div>
          <div class="detalle">Ganadas / (ganadas + perdidas)</div>
        </div>
        <div class="kpi">
          <div class="etiqueta">Oportunidades abiertas</div>
          <div class="valor">{{ d.kpis.oportunidadesAbiertas }}</div>
          <div class="detalle">{{ d.kpis.montoPipeline | quetzal }} en el embudo</div>
        </div>
        <div class="kpi">
          <div class="etiqueta">Cotizaciones abiertas</div>
          <div class="valor">{{ d.kpis.cotizacionesAbiertas }}</div>
          <div class="detalle">Borrador, enviadas o aceptadas</div>
        </div>
        <div class="kpi">
          <div class="etiqueta">Vehículos disponibles</div>
          <div class="valor">{{ d.kpis.vehiculosDisponibles }}</div>
          <div class="detalle">Inventario: {{ d.kpis.valorInventario | quetzal }}</div>
        </div>
        <div class="kpi">
          <div class="etiqueta">{{ auth.esGerencia() ? 'Clientes' : 'Mis clientes' }}</div>
          <div class="valor">{{ d.kpis.clientes }}</div>
          <div class="detalle"><a routerLink="/clientes">Ver clientes</a></div>
        </div>
      </section>

      <div class="rejilla rejilla-2 seccion">
        <div class="tarjeta">
          <h2>Ventas por mes</h2>
          <app-grafica
            tipo="bar"
            [etiquetas]="mesesEtiquetas()"
            [series]="seriesVentas()"
            descripcion="Ventas por mes en quetzales y cantidad"
          />
        </div>
        <div class="tarjeta">
          <h2>Embudo de ventas</h2>
          <p class="texto-suave texto-pequeno">
            Oportunidades creadas en el período que alcanzaron cada etapa.
          </p>
          <app-grafica
            tipo="barh"
            [etiquetas]="funnelEtiquetas()"
            [series]="funnelSeries()"
            descripcion="Embudo de ventas por etapa"
          />
        </div>
      </div>

      <div class="rejilla rejilla-2">
        <div class="tarjeta">
          <h2>Vehículos más vendidos</h2>
          @if (d.topVehiculos.length) {
            <app-grafica
              tipo="barh"
              [etiquetas]="topEtiquetas()"
              [series]="topSeries()"
              [alto]="220"
              descripcion="Vehículos más vendidos"
            />
          } @else {
            <p class="texto-suave">Sin ventas en el período.</p>
          }
        </div>
        <div class="tarjeta">
          <h2>Clasificación de clientes</h2>
          <app-grafica
            tipo="doughnut"
            [etiquetas]="clasifEtiquetas()"
            [series]="clasifSeries()"
            [alto]="220"
            descripcion="Clientes por clasificación"
          />
        </div>
      </div>

      @if (auth.esGerencia() && d.vendedores.length) {
        <div class="tarjeta">
          <div class="pagina-encabezado">
            <h2>Rendimiento por vendedor</h2>
            <a routerLink="/reportes" class="btn btn-chico">Ver reportes detallados</a>
          </div>
          <div class="tabla-contenedor">
            <table class="tabla">
              <thead>
                <tr>
                  <th>Vendedor</th>
                  <th class="numero">Ventas</th>
                  <th class="numero">Monto</th>
                  <th class="numero">Tasa de cierre</th>
                  <th class="numero">Oport. abiertas</th>
                </tr>
              </thead>
              <tbody>
                @for (v of d.vendedores; track v.vendedorId) {
                  <tr>
                    <td>{{ v.vendedor }}</td>
                    <td class="numero">{{ v.ventas }}</td>
                    <td class="numero">{{ v.monto | quetzal }}</td>
                    <td class="numero">{{ v.tasaCierre | porcentaje }}</td>
                    <td class="numero">{{ v.oportunidadesAbiertas }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      }

      <div class="tarjeta">
        <div class="pagina-encabezado">
          <h2>Próximos cierres</h2>
          <a routerLink="/oportunidades" class="btn btn-chico">Ver embudo</a>
        </div>
        @if (d.proximosCierres.length) {
          <div class="tabla-contenedor">
            <table class="tabla">
              <thead>
                <tr>
                  <th>Oportunidad</th>
                  <th>Contacto</th>
                  <th>Etapa</th>
                  <th class="numero">Monto</th>
                  <th>Cierre estimado</th>
                  @if (auth.esGerencia()) {
                    <th class="oculto-movil">Vendedor</th>
                  }
                </tr>
              </thead>
              <tbody>
                @for (o of d.proximosCierres; track o.id) {
                  <tr class="clic" [routerLink]="['/oportunidades', o.id]">
                    <td>
                      <a [routerLink]="['/oportunidades', o.id]">{{ o.titulo }}</a>
                    </td>
                    <td>{{ o.contactoNombre }}</td>
                    <td><app-insignia [valor]="o.etapa" /></td>
                    <td class="numero">{{ o.montoEstimado | quetzal }}</td>
                    <td>{{ o.fechaCierreEstimada | fechaGt }}</td>
                    @if (auth.esGerencia()) {
                      <td class="oculto-movil">{{ o.vendedorNombre }}</td>
                    }
                  </tr>
                }
              </tbody>
            </table>
          </div>
        } @else {
          <p class="texto-suave">
            No hay oportunidades abiertas. <a routerLink="/prospectos">Registre un prospecto</a> para iniciar
            el embudo.
          </p>
        }
      </div>
    }
  `,
  styles: `
    .filtros {
      align-items: flex-end;
    }
    .filtros .campo {
      min-width: 140px;
    }
    .seccion {
      margin-top: 1rem;
    }
  `,
})
export class InicioComponent {
  readonly auth = inject(AuthService);
  private readonly api = inject(ApiService);

  desde = '';
  hasta = '';
  readonly datos = signal<Dashboard | null>(null);
  readonly cargando = signal(false);
  readonly error = signal<string | null>(null);

  readonly primerNombre = computed(() => (this.auth.usuario()?.nombre ?? '').split(' ')[0]);
  readonly mesesEtiquetas = computed(() =>
    (this.datos()?.ventasPorMes ?? []).map(
      (m) => `${MESES[Number(m.periodo.slice(5, 7)) - 1]} ${m.periodo.slice(2, 4)}`,
    ),
  );
  readonly seriesVentas = computed<SerieGrafica[]>(() => {
    const v = this.datos()?.ventasPorMes ?? [];
    return [
      { nombre: 'Cantidad de ventas', datos: v.map((m) => m.cantidad), color: '#93c5fd' },
      { nombre: 'Monto (Q)', datos: v.map((m) => m.monto), color: '#1d4ed8', moneda: true, tipo: 'line' },
    ];
  });
  readonly funnelEtiquetas = computed(() => (this.datos()?.funnel.acumulado ?? []).map((e) => e.etapa));
  readonly funnelSeries = computed<SerieGrafica[]>(() => [
    {
      nombre: 'Oportunidades',
      datos: (this.datos()?.funnel.acumulado ?? []).map((e) => e.cantidad),
      color: '#16a34a',
    },
  ]);
  readonly topEtiquetas = computed(() => (this.datos()?.topVehiculos ?? []).map((t) => t.vehiculo));
  readonly topSeries = computed<SerieGrafica[]>(() => [
    {
      nombre: 'Unidades',
      datos: (this.datos()?.topVehiculos ?? []).map((t) => t.unidades),
      color: '#f59e0b',
    },
  ]);
  readonly clasifEtiquetas = computed(() =>
    (this.datos()?.clasificacionClientes ?? []).map((c) => c.clasificacion),
  );
  readonly clasifSeries = computed<SerieGrafica[]>(() => [
    { nombre: 'Clientes', datos: (this.datos()?.clasificacionClientes ?? []).map((c) => c.clientes) },
  ]);

  constructor() {
    this.cargar();
  }

  cargar(): void {
    if (this.desde && this.hasta && this.desde > this.hasta) {
      this.error.set('La fecha inicial no puede ser posterior a la final.');
      return;
    }
    this.cargando.set(true);
    this.error.set(null);
    const ruta = this.auth.esGerencia() ? '/reportes/dashboard' : '/reportes/mi-panel';
    this.api.get<Dashboard>(ruta, { desde: this.desde, hasta: this.hasta }).subscribe({
      next: (d) => {
        this.datos.set(d);
        this.desde = d.desde;
        this.hasta = d.hasta;
        this.cargando.set(false);
      },
      error: (e) => {
        this.error.set(mensajeError(e, 'No se pudieron cargar los indicadores.'));
        this.cargando.set(false);
      },
    });
  }
}
