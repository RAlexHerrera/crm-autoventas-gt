import { Component, ElementRef, OnDestroy, effect, input, viewChild } from '@angular/core';
import {
  ArcElement,
  BarController,
  BarElement,
  CategoryScale,
  Chart,
  DoughnutController,
  Legend,
  LineController,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
  Filler,
  type ChartConfiguration,
} from 'chart.js';
import { formatearQuetzales } from './pipes';

Chart.register(
  BarController,
  BarElement,
  LineController,
  LineElement,
  PointElement,
  DoughnutController,
  ArcElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
  Filler,
);

export interface SerieGrafica {
  nombre: string;
  datos: number[];
  color?: string;
  /** Si es monetaria, los ejes y tooltips se muestran en quetzales. */
  moneda?: boolean;
  tipo?: 'bar' | 'line';
}

const PALETA = ['#1d4ed8', '#16a34a', '#f59e0b', '#dc2626', '#7c3aed', '#0891b2', '#db2777', '#65a30d'];

/** Envoltorio sencillo de Chart.js (barras, líneas, dona y barras horizontales). */
@Component({
  selector: 'app-grafica',
  template: `
    <div class="lienzo" [style.height.px]="alto()">
      <canvas #lienzo role="img" [attr.aria-label]="descripcion()"></canvas>
    </div>
  `,
  styles: `
    .lienzo {
      position: relative;
      width: 100%;
    }
  `,
})
export class GraficaComponent implements OnDestroy {
  readonly tipo = input<'bar' | 'line' | 'doughnut' | 'barh'>('bar');
  readonly etiquetas = input<string[]>([]);
  readonly series = input<SerieGrafica[]>([]);
  readonly alto = input(280);
  readonly descripcion = input('Gráfica');

  private readonly lienzo = viewChild.required<ElementRef<HTMLCanvasElement>>('lienzo');
  private grafica?: Chart;

  constructor() {
    effect(() => this.dibujar());
  }

  ngOnDestroy(): void {
    this.grafica?.destroy();
  }

  private dibujar(): void {
    const tipo = this.tipo();
    const series = this.series();
    const etiquetas = this.etiquetas();
    const canvas = this.lienzo().nativeElement;
    this.grafica?.destroy();
    // jsdom (pruebas) no implementa canvas.
    if (!canvas.getContext || !canvas.getContext('2d')) return;

    const esDona = tipo === 'doughnut';
    const horizontal = tipo === 'barh';
    const moneda = series.some((s) => s.moneda);
    const formato = (v: number | string) =>
      moneda ? formatearQuetzales(Number(v)) : Number(v).toLocaleString('es-GT');

    const config: ChartConfiguration = {
      type: esDona ? 'doughnut' : horizontal ? 'bar' : tipo,
      data: {
        labels: etiquetas,
        datasets: series.map((s, i) => ({
          type: s.tipo,
          label: s.nombre,
          data: s.datos,
          backgroundColor: esDona ? PALETA : (s.color ?? PALETA[i % PALETA.length]),
          borderColor: esDona ? '#fff' : (s.color ?? PALETA[i % PALETA.length]),
          borderWidth: esDona ? 2 : s.tipo === 'line' || tipo === 'line' ? 2 : 0,
          borderRadius: esDona ? 0 : 4,
          tension: 0.3,
          yAxisID: !esDona && !horizontal && s.moneda && series.length > 1 ? 'y1' : undefined,
        })) as ChartConfiguration['data']['datasets'],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: horizontal ? 'y' : 'x',
        plugins: {
          legend: { display: esDona || series.length > 1, position: 'bottom' },
          tooltip: {
            callbacks: {
              label: (ctx) => {
                const valor = (horizontal ? ctx.parsed.x : esDona ? ctx.parsed : ctx.parsed.y) as number;
                const serie = series[ctx.datasetIndex];
                const texto = serie?.moneda ? formatearQuetzales(valor) : valor.toLocaleString('es-GT');
                return `${esDona ? ctx.label : ctx.dataset.label}: ${texto}`;
              },
            },
          },
        },
        scales: esDona
          ? {}
          : {
              x: {
                ticks: horizontal ? { callback: (v) => formato(v), precision: moneda ? undefined : 0 } : {},
                beginAtZero: true,
              },
              y: {
                beginAtZero: true,
                ticks: horizontal
                  ? {}
                  : {
                      precision: moneda && series.length === 1 ? undefined : 0,
                      callback: (v) => (series.length > 1 ? Number(v).toLocaleString('es-GT') : formato(v)),
                    },
              },
              ...(series.length > 1 && moneda && !horizontal
                ? {
                    y1: {
                      position: 'right',
                      beginAtZero: true,
                      grid: { drawOnChartArea: false },
                      ticks: { callback: (v: number | string) => formatearQuetzales(Number(v)) },
                    },
                  }
                : {}),
            },
      },
    };
    this.grafica = new Chart(canvas, config);
  }
}
