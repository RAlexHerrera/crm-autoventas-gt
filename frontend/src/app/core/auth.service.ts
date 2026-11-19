import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { RespuestaLogin, Rol, UsuarioSesion } from './modelos';

const CLAVE_TOKEN = 'av_token';
const CLAVE_USUARIO = 'av_usuario';

/** Lee el campo `exp` (segundos) de un JWT sin verificar la firma (eso lo hace el backend). */
export function expiracionToken(token: string): number | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return typeof payload.exp === 'number' ? payload.exp : null;
  } catch {
    return null;
  }
}

/**
 * Sesión del usuario: guarda el JWT, expone el usuario como signal y ofrece
 * utilidades de rol. La autorización real siempre la valida el backend.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  private readonly _usuario = signal<UsuarioSesion | null>(this.leerUsuario());
  readonly usuario = this._usuario.asReadonly();
  readonly rol = computed(() => this._usuario()?.rol ?? null);
  readonly esGerencia = computed(() => this.rol() === 'GERENTE' || this.rol() === 'ADMIN');

  /** Mensaje para mostrar en la pantalla de inicio de sesión (p. ej. sesión expirada). */
  mensajeLogin = signal<string | null>(null);

  get token(): string | null {
    try {
      return localStorage.getItem(CLAVE_TOKEN);
    } catch {
      return null;
    }
  }

  /** ¿Hay sesión con token no vencido? */
  estaAutenticado(): boolean {
    const token = this.token;
    if (!token || !this._usuario()) return false;
    const exp = expiracionToken(token);
    return exp === null || exp * 1000 > Date.now();
  }

  tieneRol(...roles: Rol[]): boolean {
    const rol = this.rol();
    return !!rol && roles.includes(rol);
  }

  iniciarSesion(email: string, password: string): Observable<RespuestaLogin> {
    return this.http.post<RespuestaLogin>('/api/auth/login', { email, password }).pipe(
      tap((r) => {
        localStorage.setItem(CLAVE_TOKEN, r.token);
        localStorage.setItem(CLAVE_USUARIO, JSON.stringify(r.usuario));
        this._usuario.set(r.usuario);
        this.mensajeLogin.set(null);
      }),
    );
  }

  cambiarPassword(actual: string, nueva: string): Observable<{ mensaje: string }> {
    return this.http.post<{ mensaje: string }>('/api/auth/cambiar-password', { actual, nueva });
  }

  cerrarSesion(mensaje?: string): void {
    try {
      localStorage.removeItem(CLAVE_TOKEN);
      localStorage.removeItem(CLAVE_USUARIO);
    } catch {
      /* almacenamiento no disponible */
    }
    this._usuario.set(null);
    this.mensajeLogin.set(mensaje ?? null);
    this.router.navigate(['/login']);
  }

  private leerUsuario(): UsuarioSesion | null {
    try {
      const texto = localStorage.getItem(CLAVE_USUARIO);
      return texto ? (JSON.parse(texto) as UsuarioSesion) : null;
    } catch {
      return null;
    }
  }
}
