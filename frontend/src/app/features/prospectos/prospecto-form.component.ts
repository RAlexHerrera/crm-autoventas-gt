import { Component, OnInit, inject, input, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import { debounceTime, merge } from 'rxjs';
import { ApiService, erroresCampos, mensajeError } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { ESTADOS_PROSPECTO, FUENTES_PROSPECTO } from '../../core/catalogos';
import { Duplicado, ErrorApi, Prospecto } from '../../core/modelos';
import { NotificacionService } from '../../core/notificacion.service';
import { VendedoresService } from '../../shared/vendedores.service';

/**
 * Registro/edición de prospectos (HU-04). Mientras se escribe el correo o el
 * teléfono se consulta si ya existe un prospecto o cliente igual (duplicados).
 */
@Component({
  selector: 'app-prospecto-form',
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <div class="migas"><a routerLink="/prospectos">Prospectos</a> › {{ id() ? 'Editar' : 'Nuevo' }}</div>
    <div class="pagina-encabezado">
      <h1>{{ id() ? 'Editar prospecto' : 'Nuevo prospecto' }}</h1>
    </div>

    @if (errorGeneral()) {
      <div class="aviso error" role="alert">{{ errorGeneral() }}</div>
    }
    @if (duplicados().length) {
      <div class="aviso alerta" role="alert">
        <strong>Posible duplicado:</strong> ya existe un registro con el mismo correo o teléfono.
        <ul>
          @for (d of duplicados(); track d.tipo + d.id) {
            <li>
              {{ d.tipo === 'cliente' ? 'Cliente' : 'Prospecto' }}
              @if (puedeAbrir(d)) {
                <a [routerLink]="[d.tipo === 'cliente' ? '/clientes' : '/prospectos', d.id]">{{
                  d.nombre
                }}</a>
              } @else {
                <strong>{{ d.nombre }}</strong>
              }
              (coincide el {{ d.coincidencia }}; atendido por {{ d.vendedorNombre }}, estado {{ d.estado }})
            </li>
          }
        </ul>
        <span class="texto-pequeno"
          >No se puede guardar un duplicado. Abra el registro existente o corrija los datos.</span
        >
      </div>
    }

    <form class="tarjeta formulario" [formGroup]="form" (ngSubmit)="guardar()" novalidate>
      <div class="campo">
        <label for="nombres">Nombres <span class="requerido">*</span></label>
        <input id="nombres" formControlName="nombres" maxlength="80" />
        @if (error('nombres')) {
          <span class="error-campo">{{ error('nombres') }}</span>
        }
      </div>
      <div class="campo">
        <label for="apellidos">Apellidos <span class="requerido">*</span></label>
        <input id="apellidos" formControlName="apellidos" maxlength="80" />
        @if (error('apellidos')) {
          <span class="error-campo">{{ error('apellidos') }}</span>
        }
      </div>
      <div class="campo">
        <label for="telefono">Teléfono <span class="requerido">*</span></label>
        <input id="telefono" formControlName="telefono" maxlength="25" placeholder="5512-3456" />
        @if (error('telefono')) {
          <span class="error-campo">{{ error('telefono') }}</span>
        }
      </div>
      <div class="campo">
        <label for="email">Correo electrónico</label>
        <input id="email" type="email" formControlName="email" maxlength="150" />
        @if (error('email')) {
          <span class="error-campo">{{ error('email') }}</span>
        }
      </div>
      <div class="campo">
        <label for="fuente">¿Cómo nos conoció? <span class="requerido">*</span></label>
        <select id="fuente" formControlName="fuente">
          <option value="" disabled>Seleccione…</option>
          @for (f of fuentes; track f) {
            <option [value]="f">{{ f }}</option>
          }
        </select>
        @if (error('fuente')) {
          <span class="error-campo">{{ error('fuente') }}</span>
        }
      </div>
      <div class="campo">
        <label for="estado">Estado</label>
        <select id="estado" formControlName="estado">
          @for (e of estadosEditables; track e) {
            <option [value]="e">{{ e }}</option>
          }
        </select>
        <span class="ayuda">«Convertido» se asigna al convertirlo en cliente o al vender.</span>
      </div>
      <div class="campo ancho-completo">
        <label for="interes">Interés</label>
        <input
          id="interes"
          formControlName="interes"
          maxlength="255"
          placeholder="Ej.: SUV automática, presupuesto Q250,000"
        />
      </div>
      @if (auth.esGerencia() && !id()) {
        <div class="campo">
          <label for="vendedorId">Asignar a vendedor <span class="requerido">*</span></label>
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
        <a [routerLink]="id() ? ['/prospectos', id()] : ['/prospectos']" class="btn">Cancelar</a>
        <button type="submit" class="btn btn-primario" [disabled]="guardando() || duplicados().length > 0">
          {{ guardando() ? 'Guardando…' : 'Guardar prospecto' }}
        </button>
      </div>
    </form>
  `,
})
export class ProspectoFormComponent implements OnInit {
  readonly id = input<string>();

  readonly auth = inject(AuthService);
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly notificaciones = inject(NotificacionService);
  readonly vendedores = toSignal(inject(VendedoresService).lista(), { initialValue: [] });

  readonly fuentes = FUENTES_PROSPECTO;
  readonly estadosEditables = ESTADOS_PROSPECTO.filter((e) => e !== 'Convertido');
  readonly guardando = signal(false);
  readonly errorGeneral = signal<string | null>(null);
  readonly erroresServidor = signal<Record<string, string>>({});
  readonly duplicados = signal<Duplicado[]>([]);

  readonly form = this.fb.group({
    nombres: ['', [Validators.required, Validators.minLength(2)]],
    apellidos: ['', [Validators.required, Validators.minLength(2)]],
    telefono: ['', [Validators.required, Validators.pattern(/^[0-9+()\-\s]{8,25}$/)]],
    email: ['', Validators.email],
    fuente: ['', Validators.required],
    estado: ['Nuevo'],
    interes: [''],
    vendedorId: [null as number | null],
  });

  constructor() {
    // Detección de duplicados en vivo.
    merge(this.form.controls.email.valueChanges, this.form.controls.telefono.valueChanges)
      .pipe(debounceTime(500), takeUntilDestroyed())
      .subscribe(() => this.verificarDuplicados());
  }

  ngOnInit(): void {
    if (this.auth.esGerencia() && !this.id())
      this.form.controls.vendedorId.addValidators(Validators.required);
    if (this.id()) {
      this.api.get<Prospecto>(`/prospectos/${this.id()}`).subscribe({
        next: (p) =>
          this.form.patchValue(
            { ...p, email: p.email ?? '', interes: p.interes ?? '' },
            { emitEvent: false },
          ),
        error: (e) => this.errorGeneral.set(mensajeError(e)),
      });
    }
  }

  puedeAbrir(d: Duplicado): boolean {
    return this.auth.esGerencia() || d.vendedorId === this.auth.usuario()?.id;
  }

  private verificarDuplicados(): void {
    const { email, telefono } = this.form.getRawValue();
    const digitos = (telefono ?? '').replace(/\D/g, '');
    const emailValido = !!email && this.form.controls.email.valid;
    if (!emailValido && digitos.length < 8) {
      this.duplicados.set([]);
      return;
    }
    this.api
      .get<{ duplicados: Duplicado[] }>('/prospectos/verificar-duplicados', {
        email: emailValido ? email : null,
        telefono: digitos.length >= 8 ? telefono : null,
        excluirProspectoId: this.id() ?? null,
      })
      .subscribe({ next: (r) => this.duplicados.set(r.duplicados) });
  }

  error(campo: string): string | null {
    const servidor = this.erroresServidor()[campo];
    if (servidor) return servidor;
    const c = this.form.get(campo);
    if (!c || !c.touched || c.valid) return null;
    if (c.hasError('required')) return 'Este campo es obligatorio.';
    if (c.hasError('minlength')) return 'Ingrese al menos 2 caracteres.';
    if (c.hasError('email')) return 'Ingrese un correo electrónico válido.';
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
      ? this.api.put<Prospecto>(`/prospectos/${this.id()}`, datos)
      : this.api.post<Prospecto>('/prospectos', datos);
    solicitud.subscribe({
      next: (p) => {
        this.notificaciones.exito(this.id() ? 'Prospecto actualizado.' : 'Prospecto registrado.');
        this.router.navigate(['/prospectos', p.id]);
      },
      error: (e) => {
        this.guardando.set(false);
        if (e instanceof HttpErrorResponse && e.status === 409) {
          this.duplicados.set((e.error as ErrorApi).duplicados ?? []);
        }
        this.erroresServidor.set(erroresCampos(e));
        this.errorGeneral.set(mensajeError(e));
      },
    });
  }
}
