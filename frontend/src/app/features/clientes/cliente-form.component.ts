import { Component, OnInit, inject, input, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { ApiService, erroresCampos, mensajeError } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { CLASIFICACIONES } from '../../core/catalogos';
import { Cliente } from '../../core/modelos';
import { NotificacionService } from '../../core/notificacion.service';
import { VendedoresService } from '../../shared/vendedores.service';

/** Registro y edición de clientes (HU-02) con validación visible. */
@Component({
  selector: 'app-cliente-form',
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <div class="migas"><a routerLink="/clientes">Clientes</a> › {{ id() ? 'Editar' : 'Nuevo' }}</div>
    <div class="pagina-encabezado">
      <h1>{{ id() ? 'Editar cliente' : 'Nuevo cliente' }}</h1>
    </div>

    @if (errorGeneral()) {
      <div class="aviso error" role="alert">{{ errorGeneral() }}</div>
    }

    <form class="tarjeta formulario" [formGroup]="form" (ngSubmit)="guardar()" novalidate>
      <div class="campo">
        <label for="nombres">Nombres <span class="requerido">*</span></label>
        <input id="nombres" formControlName="nombres" maxlength="80" autocomplete="given-name" />
        @if (error('nombres')) {
          <span class="error-campo">{{ error('nombres') }}</span>
        }
      </div>
      <div class="campo">
        <label for="apellidos">Apellidos <span class="requerido">*</span></label>
        <input id="apellidos" formControlName="apellidos" maxlength="80" autocomplete="family-name" />
        @if (error('apellidos')) {
          <span class="error-campo">{{ error('apellidos') }}</span>
        }
      </div>
      <div class="campo">
        <label for="telefono">Teléfono <span class="requerido">*</span></label>
        <input
          id="telefono"
          formControlName="telefono"
          maxlength="25"
          placeholder="5512-3456"
          autocomplete="tel"
        />
        @if (error('telefono')) {
          <span class="error-campo">{{ error('telefono') }}</span>
        }
      </div>
      <div class="campo">
        <label for="email">Correo electrónico</label>
        <input id="email" type="email" formControlName="email" maxlength="150" autocomplete="email" />
        @if (error('email')) {
          <span class="error-campo">{{ error('email') }}</span>
        }
      </div>
      <div class="campo">
        <label for="dpi">DPI</label>
        <input id="dpi" formControlName="dpi" maxlength="13" inputmode="numeric" placeholder="13 dígitos" />
        @if (error('dpi')) {
          <span class="error-campo">{{ error('dpi') }}</span>
        }
      </div>
      <div class="campo">
        <label for="nit">NIT</label>
        <input id="nit" formControlName="nit" maxlength="15" placeholder="1234567-8 o CF" />
        <span class="ayuda">Deje "CF" si es consumidor final.</span>
        @if (error('nit')) {
          <span class="error-campo">{{ error('nit') }}</span>
        }
      </div>
      <div class="campo ancho-completo">
        <label for="direccion">Dirección</label>
        <input id="direccion" formControlName="direccion" maxlength="255" autocomplete="street-address" />
      </div>
      <div class="campo">
        <label for="clasificacion">Clasificación</label>
        <select id="clasificacion" formControlName="clasificacion">
          @for (c of clasificaciones; track c) {
            <option [value]="c">{{ c }}</option>
          }
        </select>
        <span class="ayuda">Se actualiza automáticamente con cada compra (Regular, Frecuente, VIP).</span>
      </div>
      @if (auth.esGerencia()) {
        <div class="campo">
          <label for="vendedorId">Vendedor responsable <span class="requerido">*</span></label>
          <select id="vendedorId" formControlName="vendedorId">
            <option [ngValue]="null" disabled>Seleccione…</option>
            @for (v of vendedores(); track v.id) {
              <option [ngValue]="v.id">{{ v.nombre }}</option>
            }
          </select>
          @if (error('vendedorId')) {
            <span class="error-campo">{{ error('vendedorId') }}</span>
          }
        </div>
      }
      <div class="formulario-acciones">
        <a [routerLink]="id() ? ['/clientes', id()] : ['/clientes']" class="btn">Cancelar</a>
        <button type="submit" class="btn btn-primario" [disabled]="guardando()">
          {{ guardando() ? 'Guardando…' : 'Guardar cliente' }}
        </button>
      </div>
    </form>
  `,
})
export class ClienteFormComponent implements OnInit {
  /** Parámetro de ruta :id (solo al editar). */
  readonly id = input<string>();

  readonly auth = inject(AuthService);
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly notificaciones = inject(NotificacionService);
  readonly vendedores = toSignal(inject(VendedoresService).lista(), { initialValue: [] });
  readonly clasificaciones = CLASIFICACIONES;

  readonly guardando = signal(false);
  readonly errorGeneral = signal<string | null>(null);
  readonly erroresServidor = signal<Record<string, string>>({});

  readonly form = this.fb.group({
    nombres: ['', [Validators.required, Validators.minLength(2)]],
    apellidos: ['', [Validators.required, Validators.minLength(2)]],
    telefono: ['', [Validators.required, Validators.pattern(/^[0-9+()\-\s]{8,25}$/)]],
    email: ['', Validators.email],
    dpi: ['', Validators.pattern(/^\d{13}$/)],
    nit: ['CF', Validators.pattern(/^(CF|cf|\d{1,12}-?[0-9kK])$/)],
    direccion: [''],
    clasificacion: ['Nuevo'],
    vendedorId: [null as number | null],
  });

  ngOnInit(): void {
    if (this.auth.esGerencia()) this.form.controls.vendedorId.addValidators(Validators.required);
    if (this.id()) {
      this.api.get<Cliente>(`/clientes/${this.id()}`).subscribe({
        next: (c) =>
          this.form.patchValue({
            ...c,
            dpi: c.dpi ?? '',
            email: c.email ?? '',
            direccion: c.direccion ?? '',
          }),
        error: (e) => this.errorGeneral.set(mensajeError(e)),
      });
    }
  }

  /** Mensaje de error del campo: primero el del servidor, luego el de validación local. */
  error(campo: string): string | null {
    const servidor = this.erroresServidor()[campo];
    if (servidor) return servidor;
    const c = this.form.get(campo);
    if (!c || !c.touched || c.valid) return null;
    if (c.hasError('required')) return 'Este campo es obligatorio.';
    if (c.hasError('minlength')) return 'Ingrese al menos 2 caracteres.';
    if (c.hasError('email')) return 'Ingrese un correo electrónico válido.';
    if (campo === 'dpi') return 'El DPI debe tener exactamente 13 dígitos.';
    if (campo === 'nit') return 'Ingrese un NIT válido (por ejemplo 1234567-8) o CF.';
    if (campo === 'telefono') return 'Ingrese un teléfono válido (al menos 8 dígitos).';
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
    const datos = this.form.getRawValue();
    const solicitud = this.id()
      ? this.api.put<Cliente>(`/clientes/${this.id()}`, datos)
      : this.api.post<Cliente>('/clientes', datos);
    solicitud.subscribe({
      next: (c) => {
        this.notificaciones.exito(this.id() ? 'Cliente actualizado.' : 'Cliente registrado.');
        this.router.navigate(['/clientes', c.id]);
      },
      error: (e) => {
        this.guardando.set(false);
        this.erroresServidor.set(erroresCampos(e));
        this.errorGeneral.set(mensajeError(e));
      },
    });
  }
}
