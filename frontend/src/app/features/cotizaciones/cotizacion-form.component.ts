import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { ApiService, mensajeError } from '../../core/api.service';
import { Cotizacion, Oportunidad, Paginado, Vehiculo } from '../../core/modelos';
import { NotificacionService } from '../../core/notificacion.service';
import { QuetzalPipe } from '../../shared/pipes';
import { calcularTotales } from './calculos';

interface LineaFormulario {
  vehiculo: Vehiculo;
  descuento: number;
}

/**
 * Creación/edición de cotizaciones (HU-09). Solo se ofrecen vehículos
 * disponibles; el backend vuelve a verificar disponibilidad y calcula los
 * totales definitivos (aquí se muestra una vista previa).
 */
@Component({
  selector: 'app-cotizacion-form',
  imports: [FormsModule, RouterLink, QuetzalPipe],
  template: `
    <div class="migas"><a routerLink="/cotizaciones">Cotizaciones</a> › {{ id() ? 'Editar' : 'Nueva' }}</div>
    <div class="pagina-encabezado">
      <h1>{{ id() ? 'Editar cotización' : 'Nueva cotización' }}</h1>
    </div>

    @if (errorGeneral()) {
      <div class="aviso error" role="alert">{{ errorGeneral() }}</div>
    }

    <form (ngSubmit)="guardar()" novalidate>
      <div class="tarjeta formulario">
        <div class="campo">
          <label for="op">Oportunidad <span class="requerido">*</span></label>
          <select id="op" name="op" [(ngModel)]="oportunidadId" [disabled]="!!id()" required>
            <option [ngValue]="null" disabled>Seleccione una oportunidad abierta…</option>
            @for (o of oportunidades(); track o.id) {
              <option [ngValue]="o.id">{{ o.titulo }} — {{ o.contactoNombre }} ({{ o.etapa }})</option>
            }
          </select>
          @if (intentoGuardar() && !oportunidadId) {
            <span class="error-campo">Seleccione la oportunidad.</span>
          }
          @if (!oportunidades().length) {
            <span class="ayuda"
              >No tiene oportunidades abiertas.
              <a routerLink="/oportunidades/nueva">Cree una primero</a>.</span
            >
          }
        </div>
        <div class="campo">
          <label for="vigencia">Vigente hasta</label>
          <input id="vigencia" name="vigencia" type="date" [(ngModel)]="vigenciaHasta" [min]="hoy" />
          <span class="ayuda">Si la deja vacía se usan 15 días a partir de hoy.</span>
        </div>
        <div class="campo ancho-completo">
          <label for="obs">Observaciones</label>
          <textarea
            id="obs"
            name="obs"
            [(ngModel)]="observaciones"
            maxlength="500"
            placeholder="Condiciones, forma de pago, accesorios incluidos…"
          ></textarea>
        </div>
      </div>

      <div class="tarjeta">
        <h2>Vehículos</h2>
        <div class="barra-filtros">
          <div class="campo busqueda">
            <label for="agregar">Agregar vehículo disponible</label>
            <select id="agregar" name="agregar" [(ngModel)]="vehiculoParaAgregar">
              <option [ngValue]="null">Seleccione…</option>
              @for (v of vehiculosLibres(); track v.id) {
                <option [ngValue]="v">
                  {{ v.marca }} {{ v.modelo }} {{ v.anio }} · {{ v.color }} · {{ v.condicion }} —
                  {{ v.precio | quetzal }}
                </option>
              }
            </select>
          </div>
          <button type="button" class="btn" [disabled]="!vehiculoParaAgregar" (click)="agregar()">
            + Agregar
          </button>
        </div>

        @if (lineas().length === 0) {
          <p class="texto-suave">
            Agregue al menos un vehículo. Solo aparecen unidades con estado «Disponible».
          </p>
          @if (intentoGuardar()) {
            <p class="error-campo">La cotización debe incluir al menos un vehículo.</p>
          }
        } @else {
          <div class="tabla-contenedor">
            <table class="tabla">
              <thead>
                <tr>
                  <th>Vehículo</th>
                  <th class="oculto-movil">VIN</th>
                  <th class="numero">Precio</th>
                  <th class="numero">Descuento (Q)</th>
                  <th class="numero">Subtotal</th>
                  <th><span class="sr-only">Acciones</span></th>
                </tr>
              </thead>
              <tbody>
                @for (l of lineas(); track l.vehiculo.id; let i = $index) {
                  <tr>
                    <td>{{ l.vehiculo.marca }} {{ l.vehiculo.modelo }} {{ l.vehiculo.anio }}</td>
                    <td class="oculto-movil mono texto-pequeno">{{ l.vehiculo.vin }}</td>
                    <td class="numero">{{ l.vehiculo.precio | quetzal }}</td>
                    <td class="numero">
                      <input
                        class="descuento"
                        type="number"
                        min="0"
                        step="0.01"
                        [max]="l.vehiculo.precio"
                        [name]="'desc' + i"
                        [ngModel]="l.descuento"
                        (ngModelChange)="cambiarDescuento(i, $event)"
                        [attr.aria-label]="'Descuento para ' + l.vehiculo.modelo"
                      />
                      @if (l.descuento > l.vehiculo.precio || l.descuento < 0) {
                        <div class="error-campo">Entre 0 y el precio</div>
                      }
                    </td>
                    <td class="numero">{{ l.vehiculo.precio - (l.descuento || 0) | quetzal }}</td>
                    <td>
                      <button type="button" class="btn btn-peligro btn-chico" (click)="quitar(i)">
                        Quitar
                      </button>
                    </td>
                  </tr>
                }
              </tbody>
              <tfoot>
                <tr>
                  <td colspan="4" class="numero">Subtotal</td>
                  <td class="numero">{{ totales().subtotal | quetzal }}</td>
                  <td></td>
                </tr>
                <tr>
                  <td colspan="4" class="numero">(−) Descuentos</td>
                  <td class="numero">{{ totales().descuento | quetzal }}</td>
                  <td></td>
                </tr>
                <tr>
                  <td colspan="4" class="numero">Base imponible</td>
                  <td class="numero">{{ totales().baseImponible | quetzal }}</td>
                  <td></td>
                </tr>
                <tr>
                  <td colspan="4" class="numero">IVA 12 %</td>
                  <td class="numero">{{ totales().iva | quetzal }}</td>
                  <td></td>
                </tr>
                <tr class="total">
                  <td colspan="4" class="numero">TOTAL</td>
                  <td class="numero">{{ totales().total | quetzal }}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        }
      </div>

      <div class="formulario-acciones">
        <a [routerLink]="id() ? ['/cotizaciones', id()] : ['/cotizaciones']" class="btn">Cancelar</a>
        <button type="submit" class="btn btn-primario" [disabled]="guardando()">
          {{ guardando() ? 'Guardando…' : 'Guardar como borrador' }}
        </button>
      </div>
    </form>
  `,
  styles: `
    .descuento {
      max-width: 140px;
      text-align: right;
    }
    tr.total td {
      font-size: 1.05rem;
      color: var(--c-primario-osc);
    }
  `,
})
export class CotizacionFormComponent implements OnInit {
  readonly id = input<string>();
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  private readonly ruta = inject(ActivatedRoute);
  private readonly notificaciones = inject(NotificacionService);

  readonly hoy = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  readonly oportunidades = signal<Oportunidad[]>([]);
  readonly vehiculos = signal<Vehiculo[]>([]);
  readonly lineas = signal<LineaFormulario[]>([]);
  readonly guardando = signal(false);
  readonly intentoGuardar = signal(false);
  readonly errorGeneral = signal<string | null>(null);

  oportunidadId: number | null = null;
  vigenciaHasta = '';
  observaciones = '';
  vehiculoParaAgregar: Vehiculo | null = null;

  readonly vehiculosLibres = computed(() =>
    this.vehiculos().filter((v) => !this.lineas().some((l) => l.vehiculo.id === v.id)),
  );
  readonly totales = computed(() =>
    calcularTotales(this.lineas().map((l) => ({ precio: l.vehiculo.precio, descuento: l.descuento }))),
  );

  ngOnInit(): void {
    this.api
      .get<Paginado<Oportunidad>>('/oportunidades', { abiertas: true, tamano: 100 })
      .subscribe((r) => this.oportunidades.set(r.datos));
    this.api
      .get<Paginado<Vehiculo>>('/vehiculos', { estado: 'Disponible', tamano: 100, orden: 'marca' })
      .subscribe((r) => this.vehiculos.set(r.datos));

    const opId = this.ruta.snapshot.queryParamMap.get('oportunidadId');
    if (opId) {
      this.oportunidadId = Number(opId);
      // Si la oportunidad tiene vehículo de interés disponible, se propone.
      this.api.get<Oportunidad>(`/oportunidades/${opId}`).subscribe((o) => {
        if (!o.vehiculoInteresId) return;
        this.api.get<Vehiculo>(`/vehiculos/${o.vehiculoInteresId}`).subscribe((v) => {
          if (v.estado === 'Disponible' && this.lineas().length === 0)
            this.lineas.set([{ vehiculo: v, descuento: 0 }]);
        });
      });
    }

    if (this.id()) {
      this.api.get<Cotizacion>(`/cotizaciones/${this.id()}`).subscribe({
        next: (c) => {
          if (c.estado !== 'Borrador') {
            this.errorGeneral.set('Solo se pueden editar cotizaciones en estado Borrador.');
          }
          this.oportunidadId = c.oportunidadId;
          this.vigenciaHasta = c.vigenciaHasta;
          this.observaciones = c.observaciones ?? '';
          this.lineas.set(
            (c.lineas ?? []).map((l) => ({
              vehiculo: {
                id: l.vehiculoId,
                vin: l.vin,
                marca: l.marca,
                modelo: l.modelo,
                anio: l.anio,
                precio: l.precioUnitario,
              } as Vehiculo,
              descuento: l.descuento,
            })),
          );
        },
        error: (e) => this.errorGeneral.set(mensajeError(e)),
      });
    }
  }

  agregar(): void {
    if (!this.vehiculoParaAgregar) return;
    this.lineas.update((l) => [...l, { vehiculo: this.vehiculoParaAgregar as Vehiculo, descuento: 0 }]);
    this.vehiculoParaAgregar = null;
  }

  quitar(i: number): void {
    this.lineas.update((l) => l.filter((_x, j) => j !== i));
  }

  cambiarDescuento(i: number, valor: number | null): void {
    this.lineas.update((l) => l.map((x, j) => (j === i ? { ...x, descuento: Number(valor) || 0 } : x)));
  }

  guardar(): void {
    this.intentoGuardar.set(true);
    this.errorGeneral.set(null);
    const invalidas = this.lineas().some((l) => l.descuento < 0 || l.descuento > l.vehiculo.precio);
    if (!this.oportunidadId || this.lineas().length === 0 || invalidas) {
      this.errorGeneral.set('Complete la oportunidad, al menos un vehículo y descuentos válidos.');
      return;
    }
    this.guardando.set(true);
    const datos = {
      oportunidadId: this.oportunidadId,
      vigenciaHasta: this.vigenciaHasta || null,
      observaciones: this.observaciones,
      lineas: this.lineas().map((l) => ({ vehiculoId: l.vehiculo.id, descuento: l.descuento || 0 })),
    };
    const solicitud = this.id()
      ? this.api.put<Cotizacion>(`/cotizaciones/${this.id()}`, datos)
      : this.api.post<Cotizacion>('/cotizaciones', datos);
    solicitud.subscribe({
      next: (c) => {
        this.notificaciones.exito(`Cotización ${c.correlativo} guardada.`);
        this.router.navigate(['/cotizaciones', c.id]);
      },
      error: (e: HttpErrorResponse) => {
        this.guardando.set(false);
        this.errorGeneral.set(mensajeError(e));
        // Si un vehículo dejó de estar disponible, se actualiza la lista.
        if (e.status === 409) {
          this.api
            .get<Paginado<Vehiculo>>('/vehiculos', { estado: 'Disponible', tamano: 100, orden: 'marca' })
            .subscribe((r) => this.vehiculos.set(r.datos));
        }
      },
    });
  }
}
