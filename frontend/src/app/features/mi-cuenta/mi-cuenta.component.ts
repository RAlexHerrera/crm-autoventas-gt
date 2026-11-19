import { Component, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { AuthService } from '../../core/auth.service';
import { mensajeError } from '../../core/api.service';
import { NotificacionService } from '../../core/notificacion.service';

/** Validador: mínimo 8 caracteres con letras y números (igual que el backend). */
export function passwordSegura(control: AbstractControl): ValidationErrors | null {
  const v = String(control.value ?? '');
  return v.length >= 8 && /[A-Za-z]/.test(v) && /\d/.test(v) ? null : { debil: true };
}

/** Datos de la sesión y cambio de contraseña propia. */
@Component({
  selector: 'app-mi-cuenta',
  imports: [ReactiveFormsModule],
  template: `
    <div class="pagina-encabezado"><h1>Mi cuenta</h1></div>
    <div class="rejilla rejilla-2">
      <div class="tarjeta">
        <h2>Datos de la sesión</h2>
        <dl class="datos-lista">
          <dt>Nombre</dt>
          <dd>{{ auth.usuario()?.nombre }}</dd>
          <dt>Correo</dt>
          <dd>{{ auth.usuario()?.email }}</dd>
          <dt>Rol</dt>
          <dd>{{ auth.usuario()?.rolNombre || auth.usuario()?.rol }}</dd>
        </dl>
      </div>
      <div class="tarjeta">
        <h2>Cambiar contraseña</h2>
        <form [formGroup]="form" (ngSubmit)="guardar()" class="formulario" novalidate>
          <div class="campo ancho-completo">
            <label for="actual">Contraseña actual</label>
            <input id="actual" type="password" formControlName="actual" autocomplete="current-password" />
          </div>
          <div class="campo ancho-completo">
            <label for="nueva">Nueva contraseña</label>
            <input id="nueva" type="password" formControlName="nueva" autocomplete="new-password" />
            <span class="ayuda">Mínimo 8 caracteres, con letras y números.</span>
            @if (form.controls.nueva.touched && form.controls.nueva.invalid) {
              <span class="error-campo">La contraseña no cumple los requisitos.</span>
            }
          </div>
          <div class="campo ancho-completo">
            <label for="confirmar">Confirmar nueva contraseña</label>
            <input id="confirmar" type="password" formControlName="confirmar" autocomplete="new-password" />
            @if (form.controls.confirmar.touched && form.value.confirmar !== form.value.nueva) {
              <span class="error-campo">Las contraseñas no coinciden.</span>
            }
          </div>
          <div class="formulario-acciones">
            <button type="submit" class="btn btn-primario" [disabled]="guardando()">
              Actualizar contraseña
            </button>
          </div>
        </form>
      </div>
    </div>
  `,
})
export class MiCuentaComponent {
  readonly auth = inject(AuthService);
  private readonly fb = inject(FormBuilder);
  private readonly notificaciones = inject(NotificacionService);
  readonly guardando = signal(false);

  readonly form = this.fb.nonNullable.group({
    actual: ['', Validators.required],
    nueva: ['', [Validators.required, passwordSegura]],
    confirmar: ['', Validators.required],
  });

  guardar(): void {
    const v = this.form.getRawValue();
    if (this.form.invalid || v.nueva !== v.confirmar) {
      this.form.markAllAsTouched();
      return;
    }
    this.guardando.set(true);
    this.auth.cambiarPassword(v.actual, v.nueva).subscribe({
      next: () => {
        this.guardando.set(false);
        this.form.reset();
        this.notificaciones.exito('Contraseña actualizada correctamente.');
      },
      error: (e) => {
        this.guardando.set(false);
        this.notificaciones.error(mensajeError(e));
      },
    });
  }
}
