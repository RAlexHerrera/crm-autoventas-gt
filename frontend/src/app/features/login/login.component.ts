import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { mensajeError } from '../../core/api.service';

/** Pantalla de inicio de sesión (HU-01). */
@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule],
  template: `
    <div class="fondo">
      <main class="caja">
        <div class="marca">
          <span aria-hidden="true">🚙</span>
          <div>
            <h1>AutoVentas GT, S.A.</h1>
            <p>CRM de ventas de vehículos</p>
          </div>
        </div>

        @if (auth.mensajeLogin()) {
          <div class="aviso info" role="status">{{ auth.mensajeLogin() }}</div>
        }
        @if (error()) {
          <div class="aviso error" role="alert">{{ error() }}</div>
        }

        <form [formGroup]="form" (ngSubmit)="ingresar()" novalidate>
          <div class="campo">
            <label for="email">Correo electrónico</label>
            <input
              id="email"
              type="email"
              formControlName="email"
              autocomplete="username"
              placeholder="usuario@autoventas.gt"
            />
            @if (form.controls.email.touched && form.controls.email.invalid) {
              <span class="error-campo">Ingrese un correo electrónico válido.</span>
            }
          </div>
          <div class="campo">
            <label for="password">Contraseña</label>
            <div class="con-boton">
              <input
                id="password"
                [type]="verPassword() ? 'text' : 'password'"
                formControlName="password"
                autocomplete="current-password"
              />
              <button
                type="button"
                class="btn btn-chico"
                (click)="verPassword.set(!verPassword())"
                [attr.aria-pressed]="verPassword()"
              >
                {{ verPassword() ? 'Ocultar' : 'Ver' }}
              </button>
            </div>
            @if (form.controls.password.touched && form.controls.password.invalid) {
              <span class="error-campo">Ingrese su contraseña.</span>
            }
          </div>
          <button type="submit" class="btn btn-primario ancho" [disabled]="cargando()">
            {{ cargando() ? 'Ingresando…' : 'Ingresar' }}
          </button>
        </form>

        <details class="ayuda-login">
          <summary>¿Primera vez? Usuarios de prueba</summary>
          <ul class="texto-pequeno">
            <li><strong>Administrador:</strong> admin&#64;autoventas.gt / Admin123!</li>
            <li><strong>Gerente Comercial:</strong> gerente&#64;autoventas.gt / Gerente123!</li>
            <li><strong>Vendedor:</strong> vendedor&#64;autoventas.gt / Vendedor123!</li>
          </ul>
          <p class="texto-pequeno texto-suave">
            Por seguridad, tras 5 intentos fallidos el acceso se bloquea 15 minutos.
          </p>
        </details>
      </main>
    </div>
  `,
  styles: `
    .fondo {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1rem;
      background: linear-gradient(135deg, #0f1f45 0%, #1d4ed8 100%);
    }
    .caja {
      background: #fff;
      border-radius: 14px;
      padding: 2rem;
      width: 100%;
      max-width: 410px;
      box-shadow: 0 20px 50px rgb(0 0 0 / 25%);
    }
    .marca {
      display: flex;
      gap: 0.75rem;
      align-items: center;
      margin-bottom: 1.25rem;
      font-size: 2rem;
    }
    .marca h1 {
      font-size: 1.3rem;
      margin: 0;
    }
    .marca p {
      margin: 0;
      font-size: 0.9rem;
      color: var(--c-texto-suave);
    }
    form {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
    .con-boton {
      display: flex;
      gap: 0.4rem;
    }
    .ancho {
      width: 100%;
    }
    .ayuda-login {
      margin-top: 1.25rem;
    }
    .ayuda-login summary {
      cursor: pointer;
      color: var(--c-primario);
      font-size: 0.9rem;
    }
  `,
})
export class LoginComponent {
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly ruta = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder);

  readonly cargando = signal(false);
  readonly error = signal<string | null>(null);
  readonly verPassword = signal(false);

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  ingresar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.cargando.set(true);
    this.error.set(null);
    const { email, password } = this.form.getRawValue();
    this.auth.iniciarSesion(email.trim(), password).subscribe({
      next: () => {
        const volver = this.ruta.snapshot.queryParamMap.get('volver');
        this.router.navigateByUrl(
          volver && volver.startsWith('/') && !volver.startsWith('//') ? volver : '/inicio',
        );
      },
      error: (e) => {
        this.cargando.set(false);
        this.error.set(mensajeError(e, 'No se pudo iniciar sesión.'));
      },
    });
  }
}
