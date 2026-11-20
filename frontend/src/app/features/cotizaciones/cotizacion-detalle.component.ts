import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ApiService, mensajeError } from '../../core/api.service';
import { ConfirmacionService } from '../../core/confirmacion.service';
import { METODOS_PAGO, TRANSICIONES_COTIZACION } from '../../core/catalogos';
import { Cotizacion, Venta } from '../../core/modelos';
import { NotificacionService } from '../../core/notificacion.service';
import { InsigniaComponent } from '../../shared/componentes';
import { FechaGtPipe, QuetzalPipe } from '../../shared/pipes';

const TEXTO_ACCION: Record<string, { texto: string; clase: string; mensaje: string }> = {
  Enviada: {
    texto: 'Marcar como enviada',
    clase: 'btn-primario',
    mensaje: 'Registre que la cotización fue entregada al cliente.',
  },
  Aceptada: {
    texto: 'El cliente aceptó',
    clase: 'btn-exito',
    mensaje:
      'Al aceptarla, los vehículos quedan RESERVADOS para este cliente y la oportunidad pasa a Negociación.',
  },
  Rechazada: {
    texto: 'El cliente rechazó',
    clase: 'btn-peligro',
    mensaje:
      'La cotización quedará rechazada. Si estaba aceptada, los vehículos vuelven a estar disponibles.',
  },
};

/** Detalle de cotización: líneas, totales, seguimiento de estados, venta (HU-10) y PDF (HU-14). */
@Component({
  selector: 'app-cotizacion-detalle',
  imports: [FormsModule, RouterLink, InsigniaComponent, QuetzalPipe, FechaGtPipe],
  template: `
    <div class="migas"><a routerLink="/cotizaciones">Cotizaciones</a> › Detalle</div>
    @if (error()) {
      <div class="aviso error">{{ error() }}</div>
    }

    @if (cot(); as c) {
      <div class="pagina-encabezado">
        <div>
          <h1 class="mono">{{ c.correlativo }}</h1>
          <p>
            <app-insignia [valor]="c.estado" /> · Emitida el {{ c.fecha | fechaGt }} · Vigente hasta
            {{ c.vigenciaHasta | fechaGt }}
          </p>
        </div>
        <div class="acciones">
          <button type="button" class="btn" (click)="descargarPdf()" [disabled]="descargando()">⬇ PDF</button>
          @if (c.estado === 'Borrador') {
            <a [routerLink]="['/cotizaciones', c.id, 'editar']" class="btn">Editar</a>
            <button type="button" class="btn btn-peligro" (click)="eliminar(c)">Eliminar</button>
          }
          @for (e of acciones(); track e) {
            <button type="button" [class]="'btn ' + textoAccion[e].clase" (click)="cambiarEstado(e)">
              {{ textoAccion[e].texto }}
            </button>
          }
          @if (c.estado === 'Aceptada') {
            <button type="button" class="btn btn-exito" (click)="abrirVenta()">💰 Registrar venta</button>
          }
          @if (c.ventaId) {
            <a [routerLink]="['/ventas', c.ventaId]" class="btn btn-primario">Ver venta</a>
          }
        </div>
      </div>

      @if (c.estado === 'Vencida') {
        <div class="aviso alerta">
          Esta cotización venció sin ser aceptada. Cree una nueva desde la oportunidad si el cliente sigue
          interesado.
        </div>
      }
      @if (c.estado === 'Aceptada') {
        <div class="aviso exito">
          Cotización aceptada: los vehículos están reservados. El siguiente paso es
          <strong>registrar la venta</strong>.
        </div>
      }

      <div class="rejilla rejilla-2">
        <div class="tarjeta">
          <h2>{{ c.contactoTipo }}</h2>
          <dl class="datos-lista">
            <dt>Nombre</dt>
            <dd>
              <a [routerLink]="c.clienteId ? ['/clientes', c.clienteId] : ['/prospectos', c.prospectoId]">{{
                c.contactoNombre
              }}</a>
            </dd>
            <dt>Teléfono</dt>
            <dd>{{ c.contactoTelefono || '—' }}</dd>
            <dt>Correo</dt>
            <dd>{{ c.contactoEmail || '—' }}</dd>
          </dl>
        </div>
        <div class="tarjeta">
          <h2>Seguimiento</h2>
          <dl class="datos-lista">
            <dt>Oportunidad</dt>
            <dd>
              <a [routerLink]="['/oportunidades', c.oportunidadId]">{{ c.oportunidadTitulo }}</a>
            </dd>
            <dt>Etapa</dt>
            <dd><app-insignia [valor]="c.oportunidadEtapa" /></dd>
            <dt>Vendedor</dt>
            <dd>{{ c.vendedorNombre }}</dd>
            <dt>Observaciones</dt>
            <dd>{{ c.observaciones || '—' }}</dd>
          </dl>
        </div>
      </div>

      <div class="tarjeta">
        <h2>Detalle</h2>
        <div class="tabla-contenedor">
          <table class="tabla">
            <thead>
              <tr>
                <th>Vehículo</th>
                <th class="oculto-movil">VIN</th>
                <th class="numero">Precio</th>
                <th class="numero">Descuento</th>
                <th class="numero">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              @for (l of c.lineas; track l.id) {
                <tr>
                  <td>
                    <a [routerLink]="['/vehiculos', l.vehiculoId]"
                      >{{ l.marca }} {{ l.modelo }} {{ l.anio }}</a
                    >
                    <div class="texto-pequeno texto-suave">
                      {{ l.version }} · {{ l.color }} · {{ l.condicion }} ·
                      <app-insignia [valor]="l.vehiculoEstado" />
                    </div>
                  </td>
                  <td class="oculto-movil mono texto-pequeno">{{ l.vin }}</td>
                  <td class="numero">{{ l.precioUnitario | quetzal }}</td>
                  <td class="numero">{{ l.descuento | quetzal }}</td>
                  <td class="numero">{{ l.subtotal | quetzal }}</td>
                </tr>
              }
            </tbody>
            <tfoot>
              <tr>
                <td colspan="4" class="numero">Subtotal</td>
                <td class="numero">{{ c.subtotal | quetzal }}</td>
              </tr>
              <tr>
                <td colspan="4" class="numero">(−) Descuentos</td>
                <td class="numero">{{ c.descuento | quetzal }}</td>
              </tr>
              <tr>
                <td colspan="4" class="numero">Base imponible</td>
                <td class="numero">{{ c.baseImponible | quetzal }}</td>
              </tr>
              <tr>
                <td colspan="4" class="numero">IVA {{ c.ivaTasa * 100 }} %</td>
                <td class="numero">{{ c.iva | quetzal }}</td>
              </tr>
              <tr class="total">
                <td colspan="4" class="numero">TOTAL</td>
                <td class="numero">{{ c.total | quetzal }}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      @if (mostrarVenta()) {
        <div class="dialogo-fondo">
          <form
            class="dialogo"
            role="dialog"
            aria-modal="true"
            aria-labelledby="venta-titulo"
            (ngSubmit)="registrarVenta()"
          >
            <h2 id="venta-titulo">Registrar venta</h2>
            <p>
              Se registrará la venta por <strong>{{ c.total | quetzal }}</strong>. En una sola operación:
            </p>
            <ul class="texto-pequeno">
              <li>los vehículos pasan a <strong>Vendido</strong>;</li>
              <li>la oportunidad pasa a <strong>Ganado</strong>;</li>
              @if (c.contactoTipo === 'Prospecto') {
                <li>el prospecto se <strong>convierte en cliente</strong>;</li>
              }
              <li>si algo falla, no se guarda nada.</li>
            </ul>
            <div class="formulario">
              <div class="campo">
                <label for="metodo">Método de pago <span class="requerido">*</span></label>
                <select id="metodo" name="metodo" [(ngModel)]="metodoPago" required>
                  @for (m of metodos; track m) {
                    <option [value]="m">{{ m }}</option>
                  }
                </select>
              </div>
              @if (c.contactoTipo === 'Prospecto') {
                <div class="campo">
                  <label for="v-nit">NIT del nuevo cliente</label>
                  <input
                    id="v-nit"
                    name="nit"
                    [(ngModel)]="datosCliente.nit"
                    placeholder="CF"
                    maxlength="15"
                  />
                </div>
                <div class="campo">
                  <label for="v-dpi">DPI</label>
                  <input
                    id="v-dpi"
                    name="dpi"
                    [(ngModel)]="datosCliente.dpi"
                    maxlength="13"
                    inputmode="numeric"
                  />
                </div>
                <div class="campo">
                  <label for="v-dir">Dirección</label>
                  <input id="v-dir" name="dir" [(ngModel)]="datosCliente.direccion" maxlength="255" />
                </div>
              }
              <div class="campo ancho-completo">
                <label for="v-obs">Observaciones</label>
                <textarea id="v-obs" name="obs" [(ngModel)]="observacionesVenta" maxlength="500"></textarea>
              </div>
            </div>
            @if (errorVenta()) {
              <div class="aviso error">{{ errorVenta() }}</div>
            }
            <div class="formulario-acciones">
              <button type="button" class="btn" (click)="mostrarVenta.set(false)">Cancelar</button>
              <button type="submit" class="btn btn-exito" [disabled]="procesando()">
                {{ procesando() ? 'Registrando…' : 'Confirmar venta' }}
              </button>
            </div>
          </form>
        </div>
      }
    } @else if (!error()) {
      <div class="cargando">Cargando cotización…</div>
    }
  `,
  styles: `
    tr.total td {
      font-size: 1.05rem;
      color: var(--c-primario-osc);
    }
  `,
})
export class CotizacionDetalleComponent implements OnInit {
  readonly id = input.required<string>();
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  private readonly confirmacion = inject(ConfirmacionService);
  private readonly notificaciones = inject(NotificacionService);

  readonly textoAccion = TEXTO_ACCION;
  readonly metodos = METODOS_PAGO;
  readonly cot = signal<Cotizacion | null>(null);
  readonly error = signal<string | null>(null);
  readonly mostrarVenta = signal(false);
  readonly procesando = signal(false);
  readonly descargando = signal(false);
  readonly errorVenta = signal<string | null>(null);
  readonly acciones = computed(() => TRANSICIONES_COTIZACION[this.cot()?.estado ?? ''] ?? []);

  metodoPago = 'Contado';
  observacionesVenta = '';
  datosCliente = { nit: 'CF', dpi: '', direccion: '' };

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.api.get<Cotizacion>(`/cotizaciones/${this.id()}`).subscribe({
      next: (c) => this.cot.set(c),
      error: (e) => this.error.set(mensajeError(e)),
    });
  }

  async cambiarEstado(estado: string): Promise<void> {
    const info = TEXTO_ACCION[estado];
    const ok = await this.confirmacion.confirmar({
      titulo: info.texto,
      mensaje: info.mensaje,
      textoConfirmar: 'Confirmar',
      peligro: estado === 'Rechazada',
    });
    if (!ok) return;
    this.api.patch<Cotizacion>(`/cotizaciones/${this.id()}/estado`, { estado }).subscribe({
      next: (c) => {
        this.cot.set(c);
        this.notificaciones.exito(`Cotización ${c.correlativo}: ${estado.toLowerCase()}.`);
      },
      error: (e) => {
        this.notificaciones.error(mensajeError(e));
        this.cargar();
      },
    });
  }

  abrirVenta(): void {
    this.errorVenta.set(null);
    this.mostrarVenta.set(true);
  }

  /** Envía la venta. El servidor actualiza vehículo, oportunidad y cliente en una sola transacción. */
  registrarVenta(): void {
    this.procesando.set(true);
    this.errorVenta.set(null);
    this.api
      .post<Venta>('/ventas', {
        cotizacionId: Number(this.id()),
        metodoPago: this.metodoPago,
        observaciones: this.observacionesVenta,
        cliente: this.cot()?.contactoTipo === 'Prospecto' ? this.datosCliente : undefined,
      })
      .subscribe({
        next: (v) => {
          this.notificaciones.exito(`Venta ${v.correlativo} registrada correctamente.`);
          this.router.navigate(['/ventas', v.id]);
        },
        error: (e) => {
          this.procesando.set(false);
          this.errorVenta.set(mensajeError(e));
        },
      });
  }

  descargarPdf(): void {
    const c = this.cot();
    if (!c) return;
    this.descargando.set(true);
    this.api.descargar(`/cotizaciones/${c.id}/pdf`).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${c.correlativo}.pdf`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        this.descargando.set(false);
      },
      error: (e) => {
        this.descargando.set(false);
        this.notificaciones.error(mensajeError(e, 'No se pudo generar el PDF.'));
      },
    });
  }

  async eliminar(c: Cotizacion): Promise<void> {
    const ok = await this.confirmacion.confirmar({
      titulo: 'Eliminar cotización',
      mensaje: `¿Eliminar el borrador ${c.correlativo}? Esta acción no se puede deshacer.`,
      textoConfirmar: 'Eliminar',
      peligro: true,
    });
    if (!ok) return;
    this.api.delete(`/cotizaciones/${c.id}`).subscribe({
      next: () => {
        this.notificaciones.exito('Cotización eliminada.');
        this.router.navigate(['/cotizaciones']);
      },
      error: (e) => this.notificaciones.error(mensajeError(e)),
    });
  }
}
