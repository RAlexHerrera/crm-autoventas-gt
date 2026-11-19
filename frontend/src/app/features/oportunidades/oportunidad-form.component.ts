import { Component, OnInit, inject, input, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { ApiService, erroresCampos, mensajeError } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { ETAPAS_ABIERTAS } from '../../core/catalogos';
import { Cliente, Oportunidad, Paginado, Prospecto, Vehiculo } from '../../core/modelos';
import { NotificacionService } from '../../core/notificacion.service';
import { QuetzalPipe } from '../../shared/pipes';
import { VendedoresService } from '../../shared/vendedores.service';

interface Contacto {
  id: number;
  nombre: string;
  detalle: string;
}

/** Registro y edición de oportunidades (HU-06). */
@Component({
  selector: 'app-oportunidad-form',
  imports: [ReactiveFormsModule, FormsModule, RouterLink, QuetzalPipe],
  template: `
    <div class="migas">
      <a routerLink="/oportunidades">Oportunidades</a> › {{ id() ? 'Editar' : 'Nueva' }}
    </div>
    <div class="pagina-encabezado">
      <h1>{{ id() ? 'Editar oportunidad' : 'Nueva oportunidad' }}</h1>
    </div>

    @if (errorGeneral()) {
      <div class="aviso error" role="alert">{{ errorGeneral() }}</div>
    }

    <form class="tarjeta formulario" [formGroup]="form" (ngSubmit)="guardar()" novalidate>
      @if (!id()) {
        <fieldset class="ancho-completo contacto">
          <legend>¿Para quién es la oportunidad? <span class="requerido">*</span></legend>
          <div class="acciones">
            <label
              ><input
                type="radio"
                name="tipo"
                value="prospecto"
                [ngModel]="tipoContacto()"
                [ngModelOptions]="{ standalone: true }"
                (ngModelChange)="cambiarTipo($event)"
              />
              Prospecto</label
            >
            <label
              ><input
                type="radio"
                name="tipo"
                value="cliente"
                [ngModel]="tipoContacto()"
                [ngModelOptions]="{ standalone: true }"
                (ngModelChange)="cambiarTipo($event)"
              />
              Cliente</label
            >
          </div>
          <div class="formulario">
            <div class="campo">
              <label for="buscar-contacto">Buscar {{ tipoContacto() }}</label>
              <input
                id="buscar-contacto"
                type="search"
                [ngModel]="busquedaContacto"
                [ngModelOptions]="{ standalone: true }"
                (ngModelChange)="busquedaContacto = $event; buscarContactos()"
                placeholder="Escriba un nombre…"
              />
            </div>
            <div class="campo">
              <label for="contactoId">Seleccione</label>
              <select id="contactoId" formControlName="contactoId">
                <option [ngValue]="null" disabled>
                  {{ contactos().length ? 'Seleccione…' : 'Sin resultados' }}
                </option>
                @for (c of contactos(); track c.id) {
                  <option [ngValue]="c.id">{{ c.nombre }} — {{ c.detalle }}</option>
                }
              </select>
              @if (form.controls.contactoId.touched && form.controls.contactoId.invalid) {
                <span class="error-campo">Seleccione el {{ tipoContacto() }}.</span>
              }
            </div>
          </div>
        </fieldset>
      }
      <div class="campo ancho-completo">
        <label for="titulo">Título <span class="requerido">*</span></label>
        <input
          id="titulo"
          formControlName="titulo"
          maxlength="120"
          placeholder="Ej.: Pickup 4x4 para finca"
        />
        @if (error('titulo')) {
          <span class="error-campo">{{ error('titulo') }}</span>
        }
      </div>
      <div class="campo">
        <label for="vehiculo">Vehículo de interés</label>
        <select id="vehiculo" formControlName="vehiculoInteresId" (change)="sugerirMonto()">
          <option [ngValue]="null">Sin definir</option>
          @for (v of vehiculos(); track v.id) {
            <option [ngValue]="v.id">
              {{ v.marca }} {{ v.modelo }} {{ v.anio }} ({{ v.condicion }}) — {{ v.precio | quetzal }}
            </option>
          }
        </select>
      </div>
      <div class="campo">
        <label for="monto">Monto estimado (Q)</label>
        <input id="monto" type="number" min="0" step="0.01" formControlName="montoEstimado" />
        @if (error('montoEstimado')) {
          <span class="error-campo">{{ error('montoEstimado') }}</span>
        }
      </div>
      <div class="campo">
        <label for="cierre">Fecha estimada de cierre</label>
        <input id="cierre" type="date" formControlName="fechaCierreEstimada" />
      </div>
      @if (!id()) {
        <div class="campo">
          <label for="etapa">Etapa inicial</label>
          <select id="etapa" formControlName="etapa">
            @for (e of etapas; track e) {
              <option [value]="e">{{ e }}</option>
            }
          </select>
        </div>
        @if (auth.esGerencia()) {
          <div class="campo">
            <label for="vendedor">Vendedor</label>
            <select id="vendedor" formControlName="vendedorId">
              <option [ngValue]="null">El responsable del contacto</option>
              @for (v of vendedores(); track v.id) {
                <option [ngValue]="v.id">{{ v.nombre }}</option>
              }
            </select>
          </div>
        }
      }
      <div class="formulario-acciones">
        <a [routerLink]="id() ? ['/oportunidades', id()] : ['/oportunidades']" class="btn">Cancelar</a>
        <button type="submit" class="btn btn-primario" [disabled]="guardando()">
          {{ guardando() ? 'Guardando…' : 'Guardar oportunidad' }}
        </button>
      </div>
    </form>
  `,
  styles: `
    .contacto {
      border: 1px solid var(--c-borde);
      border-radius: 8px;
      padding: 0.75rem 1rem;
    }
    .contacto legend {
      font-weight: 600;
      padding: 0 0.3rem;
    }
    .contacto .acciones {
      margin-bottom: 0.6rem;
    }
  `,
})
export class OportunidadFormComponent implements OnInit {
  readonly id = input<string>();
  readonly auth = inject(AuthService);
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  private readonly ruta = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder);
  private readonly notificaciones = inject(NotificacionService);
  readonly vendedores = toSignal(inject(VendedoresService).lista(), { initialValue: [] });

  readonly etapas = ETAPAS_ABIERTAS;
  readonly tipoContacto = signal<'prospecto' | 'cliente'>('prospecto');
  readonly contactos = signal<Contacto[]>([]);
  readonly vehiculos = signal<Vehiculo[]>([]);
  readonly guardando = signal(false);
  readonly errorGeneral = signal<string | null>(null);
  readonly erroresServidor = signal<Record<string, string>>({});
  busquedaContacto = '';
  private temporizador?: ReturnType<typeof setTimeout>;

  readonly form = this.fb.group({
    contactoId: [null as number | null],
    titulo: ['', [Validators.required, Validators.minLength(3)]],
    vehiculoInteresId: [null as number | null],
    montoEstimado: [0, [Validators.min(0)]],
    fechaCierreEstimada: [''],
    etapa: ['Prospección'],
    vendedorId: [null as number | null],
  });

  ngOnInit(): void {
    this.api
      .get<Paginado<Vehiculo>>('/vehiculos', { estado: 'Disponible', tamano: 100, orden: 'marca' })
      .subscribe({ next: (r) => this.vehiculos.set(r.datos) });

    if (this.id()) {
      this.api.get<Oportunidad>(`/oportunidades/${this.id()}`).subscribe({
        next: (o) => {
          this.form.patchValue({ ...o, fechaCierreEstimada: o.fechaCierreEstimada ?? '' });
          // El vehículo de interés puede ya no estar disponible: se agrega a la lista.
          if (o.vehiculoInteresId && !this.vehiculos().some((v) => v.id === o.vehiculoInteresId)) {
            this.api
              .get<Vehiculo>(`/vehiculos/${o.vehiculoInteresId}`)
              .subscribe((v) => this.vehiculos.update((l) => [v, ...l]));
          }
        },
        error: (e) => this.errorGeneral.set(mensajeError(e)),
      });
      return;
    }

    this.form.controls.contactoId.addValidators(Validators.required);
    const qp = this.ruta.snapshot.queryParamMap;
    const clienteId = qp.get('clienteId');
    const prospectoId = qp.get('prospectoId');
    if (clienteId) {
      this.tipoContacto.set('cliente');
      this.api.get<Cliente>(`/clientes/${clienteId}`).subscribe((c) => {
        this.contactos.set([{ id: c.id, nombre: c.nombreCompleto, detalle: c.telefono }]);
        this.form.patchValue({ contactoId: c.id });
      });
    } else if (prospectoId) {
      this.api.get<Prospecto>(`/prospectos/${prospectoId}`).subscribe((p) => {
        this.contactos.set([{ id: p.id, nombre: p.nombreCompleto, detalle: p.telefono }]);
        this.form.patchValue({ contactoId: p.id, titulo: p.interes ? p.interes.slice(0, 120) : '' });
      });
    } else {
      this.buscarContactos();
    }
  }

  cambiarTipo(tipo: 'prospecto' | 'cliente'): void {
    this.tipoContacto.set(tipo);
    this.form.patchValue({ contactoId: null });
    this.buscarContactos();
  }

  buscarContactos(): void {
    clearTimeout(this.temporizador);
    this.temporizador = setTimeout(() => {
      const esCliente = this.tipoContacto() === 'cliente';
      if (esCliente) {
        this.api
          .get<Paginado<Cliente>>('/clientes', { q: this.busquedaContacto, tamano: 30 })
          .subscribe((r) =>
            this.contactos.set(
              r.datos.map((c) => ({ id: c.id, nombre: c.nombreCompleto, detalle: c.telefono })),
            ),
          );
      } else {
        this.api
          .get<Paginado<Prospecto>>('/prospectos', { q: this.busquedaContacto, tamano: 30 })
          .subscribe((r) =>
            this.contactos.set(
              r.datos
                .filter((p) => p.estado !== 'Convertido' && p.estado !== 'Descartado')
                .map((p) => ({ id: p.id, nombre: p.nombreCompleto, detalle: `${p.estado} · ${p.telefono}` })),
            ),
          );
      }
    }, 300);
  }

  sugerirMonto(): void {
    const v = this.vehiculos().find((x) => x.id === this.form.value.vehiculoInteresId);
    if (v && !this.form.value.montoEstimado) this.form.patchValue({ montoEstimado: v.precio });
  }

  error(campo: string): string | null {
    const servidor = this.erroresServidor()[campo];
    if (servidor) return servidor;
    const c = this.form.get(campo);
    if (!c || !c.touched || c.valid) return null;
    if (c.hasError('required')) return 'Este campo es obligatorio.';
    if (c.hasError('minlength')) return 'Ingrese al menos 3 caracteres.';
    if (c.hasError('min')) return 'El monto no puede ser negativo.';
    return 'Valor inválido.';
  }

  guardar(): void {
    this.erroresServidor.set({});
    this.errorGeneral.set(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.errorGeneral.set('Revise los campos marcados en rojo.');
      return;
    }
    this.guardando.set(true);
    const v = this.form.getRawValue();
    const comunes = {
      titulo: v.titulo,
      vehiculoInteresId: v.vehiculoInteresId,
      montoEstimado: v.montoEstimado || 0,
      fechaCierreEstimada: v.fechaCierreEstimada || null,
    };
    const solicitud = this.id()
      ? this.api.put<Oportunidad>(`/oportunidades/${this.id()}`, comunes)
      : this.api.post<Oportunidad>('/oportunidades', {
          ...comunes,
          etapa: v.etapa,
          vendedorId: v.vendedorId,
          [this.tipoContacto() === 'cliente' ? 'clienteId' : 'prospectoId']: v.contactoId,
        });
    solicitud.subscribe({
      next: (o) => {
        this.notificaciones.exito(this.id() ? 'Oportunidad actualizada.' : 'Oportunidad creada.');
        this.router.navigate(['/oportunidades', o.id]);
      },
      error: (e) => {
        this.guardando.set(false);
        this.erroresServidor.set(erroresCampos(e));
        this.errorGeneral.set(mensajeError(e));
      },
    });
  }
}
