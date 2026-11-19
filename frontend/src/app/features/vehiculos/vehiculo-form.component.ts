import { Component, OnInit, inject, input, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ApiService, erroresCampos, mensajeError } from '../../core/api.service';
import { CatalogosVehiculo, Vehiculo } from '../../core/modelos';
import { NotificacionService } from '../../core/notificacion.service';

/** VIN: 17 caracteres alfanuméricos sin I, O ni Q (se ignoran espacios y guiones). */
export function vinValido(control: AbstractControl): ValidationErrors | null {
  const vin = String(control.value ?? '')
    .replace(/[\s-]/g, '')
    .toUpperCase();
  if (!vin) return null;
  return /^[A-HJ-NPR-Z0-9]{17}$/.test(vin) ? null : { vin: true };
}

/** Registro y edición de vehículos (HU-07). Solo gerente y administrador. */
@Component({
  selector: 'app-vehiculo-form',
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <div class="migas"><a routerLink="/vehiculos">Vehículos</a> › {{ id() ? 'Editar' : 'Nuevo' }}</div>
    <div class="pagina-encabezado">
      <h1>{{ id() ? 'Editar vehículo' : 'Registrar vehículo' }}</h1>
    </div>
    @if (errorGeneral()) {
      <div class="aviso error" role="alert">{{ errorGeneral() }}</div>
    }

    <form class="tarjeta formulario" [formGroup]="form" (ngSubmit)="guardar()" novalidate>
      <div class="campo ancho-completo">
        <label for="vin">VIN (número de identificación vehicular) <span class="requerido">*</span></label>
        <input
          id="vin"
          class="mono"
          formControlName="vin"
          maxlength="21"
          placeholder="17 caracteres, p. ej. 1HGCM82633A004352"
          (blur)="normalizarVin()"
        />
        <span class="ayuda"
          >Único por vehículo. Letras y números, sin I, O ni Q. Se guarda en mayúsculas.</span
        >
        @if (error('vin')) {
          <span class="error-campo">{{ error('vin') }}</span>
        }
      </div>
      <div class="campo">
        <label for="marca">Marca <span class="requerido">*</span></label>
        <input id="marca" formControlName="marca" maxlength="40" list="marcas" />
        <datalist id="marcas">
          @for (m of catalogos()?.marcas ?? []; track m) {
            <option [value]="m"></option>
          }
        </datalist>
        @if (error('marca')) {
          <span class="error-campo">{{ error('marca') }}</span>
        }
      </div>
      <div class="campo">
        <label for="modelo">Modelo <span class="requerido">*</span></label>
        <input id="modelo" formControlName="modelo" maxlength="60" />
        @if (error('modelo')) {
          <span class="error-campo">{{ error('modelo') }}</span>
        }
      </div>
      <div class="campo">
        <label for="anio">Año <span class="requerido">*</span></label>
        <input id="anio" type="number" formControlName="anio" [min]="1980" [max]="anioMaximo" />
        @if (error('anio')) {
          <span class="error-campo">{{ error('anio') }}</span>
        }
      </div>
      <div class="campo">
        <label for="version">Versión</label>
        <input id="version" formControlName="version" maxlength="60" placeholder="Ej.: LX, 4x4, Hybrid" />
      </div>
      <div class="campo">
        <label for="tipo">Tipo <span class="requerido">*</span></label>
        <select id="tipo" formControlName="tipo">
          <option value="" disabled>Seleccione…</option>
          @for (t of catalogos()?.tipos ?? []; track t) {
            <option [value]="t">{{ t }}</option>
          }
        </select>
        @if (error('tipo')) {
          <span class="error-campo">{{ error('tipo') }}</span>
        }
      </div>
      <div class="campo">
        <label for="condicion">Condición <span class="requerido">*</span></label>
        <select id="condicion" formControlName="condicion">
          <option value="Nuevo">Nuevo</option>
          <option value="Usado">Usado</option>
        </select>
      </div>
      <div class="campo">
        <label for="color">Color <span class="requerido">*</span></label>
        <input id="color" formControlName="color" maxlength="30" />
        @if (error('color')) {
          <span class="error-campo">{{ error('color') }}</span>
        }
      </div>
      <div class="campo">
        <label for="transmision">Transmisión <span class="requerido">*</span></label>
        <select id="transmision" formControlName="transmision">
          @for (t of catalogos()?.transmisiones ?? []; track t) {
            <option [value]="t">{{ t }}</option>
          }
        </select>
      </div>
      <div class="campo">
        <label for="combustible">Combustible <span class="requerido">*</span></label>
        <select id="combustible" formControlName="combustible">
          @for (c of catalogos()?.combustibles ?? []; track c) {
            <option [value]="c">{{ c }}</option>
          }
        </select>
      </div>
      <div class="campo">
        <label for="motor">Motor</label>
        <input id="motor" formControlName="motor" maxlength="40" placeholder="Ej.: 2.0 L turbo" />
      </div>
      <div class="campo">
        <label for="km">Kilometraje</label>
        <input id="km" type="number" min="0" formControlName="kilometraje" />
        @if (error('kilometraje')) {
          <span class="error-campo">{{ error('kilometraje') }}</span>
        }
      </div>
      <div class="campo">
        <label for="precio">Precio de venta (Q, sin IVA) <span class="requerido">*</span></label>
        <input id="precio" type="number" min="0.01" step="0.01" formControlName="precio" />
        @if (error('precio')) {
          <span class="error-campo">{{ error('precio') }}</span>
        }
      </div>
      <div class="campo ancho-completo">
        <label for="descripcion">Descripción / observaciones</label>
        <textarea id="descripcion" formControlName="descripcion" maxlength="500"></textarea>
      </div>
      <div class="formulario-acciones">
        <a [routerLink]="id() ? ['/vehiculos', id()] : ['/vehiculos']" class="btn">Cancelar</a>
        <button type="submit" class="btn btn-primario" [disabled]="guardando()">
          {{ guardando() ? 'Guardando…' : 'Guardar vehículo' }}
        </button>
      </div>
    </form>
  `,
})
export class VehiculoFormComponent implements OnInit {
  readonly id = input<string>();
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly notificaciones = inject(NotificacionService);

  readonly anioMaximo = new Date().getFullYear() + 1;
  readonly catalogos = signal<CatalogosVehiculo | null>(null);
  readonly guardando = signal(false);
  readonly errorGeneral = signal<string | null>(null);
  readonly erroresServidor = signal<Record<string, string>>({});

  readonly form = this.fb.group({
    vin: ['', [Validators.required, vinValido]],
    marca: ['', Validators.required],
    modelo: ['', Validators.required],
    anio: [
      new Date().getFullYear() as number | null,
      [Validators.required, Validators.min(1980), Validators.max(this.anioMaximo)],
    ],
    version: [''],
    tipo: ['', Validators.required],
    condicion: ['Nuevo', Validators.required],
    color: ['', [Validators.required, Validators.minLength(3)]],
    transmision: ['Automática', Validators.required],
    combustible: ['Gasolina', Validators.required],
    motor: [''],
    kilometraje: [0 as number | null, [Validators.min(0)]],
    precio: [null as number | null, [Validators.required, Validators.min(0.01)]],
    descripcion: [''],
  });

  ngOnInit(): void {
    this.api.get<CatalogosVehiculo>('/vehiculos/catalogos').subscribe((c) => this.catalogos.set(c));
    if (this.id()) {
      this.api.get<Vehiculo>(`/vehiculos/${this.id()}`).subscribe({
        next: (v) =>
          this.form.patchValue({
            ...v,
            version: v.version ?? '',
            motor: v.motor ?? '',
            descripcion: v.descripcion ?? '',
          }),
        error: (e) => this.errorGeneral.set(mensajeError(e)),
      });
    }
  }

  normalizarVin(): void {
    const c = this.form.controls.vin;
    c.setValue(
      String(c.value ?? '')
        .replace(/[\s-]/g, '')
        .toUpperCase(),
    );
  }

  error(campo: string): string | null {
    const servidor = this.erroresServidor()[campo];
    if (servidor) return servidor;
    const c = this.form.get(campo);
    if (!c || !c.touched || c.valid) return null;
    if (c.hasError('required')) return 'Este campo es obligatorio.';
    if (c.hasError('vin')) return 'El VIN debe tener 17 caracteres (letras y números, sin I, O ni Q).';
    if (campo === 'anio') return `El año debe estar entre 1980 y ${this.anioMaximo}.`;
    if (campo === 'precio') return 'El precio debe ser mayor que cero.';
    if (c.hasError('min')) return 'No puede ser negativo.';
    if (c.hasError('minlength')) return 'Ingrese al menos 3 caracteres.';
    return 'Valor inválido.';
  }

  guardar(): void {
    this.normalizarVin();
    this.erroresServidor.set({});
    this.errorGeneral.set(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.errorGeneral.set('Revise los campos marcados en rojo.');
      return;
    }
    this.guardando.set(true);
    const datos = this.form.getRawValue();
    const solicitud = this.id()
      ? this.api.put<Vehiculo>(`/vehiculos/${this.id()}`, datos)
      : this.api.post<Vehiculo>('/vehiculos', datos);
    solicitud.subscribe({
      next: (v) => {
        this.notificaciones.exito(this.id() ? 'Vehículo actualizado.' : 'Vehículo registrado.');
        this.router.navigate(['/vehiculos', v.id]);
      },
      error: (e) => {
        this.guardando.set(false);
        this.erroresServidor.set(erroresCampos(e));
        this.errorGeneral.set(mensajeError(e));
      },
    });
  }
}
