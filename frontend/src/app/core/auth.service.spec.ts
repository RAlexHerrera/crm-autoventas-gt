import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { AuthService, expiracionToken } from './auth.service';

/** Crea un JWT de prueba (sin firma válida; el frontend no verifica firmas). */
function tokenFalso(expSegundos: number): string {
  const b64 = (o: object) => btoa(JSON.stringify(o)).replace(/=+$/, '');
  return `${b64({ alg: 'HS256' })}.${b64({ sub: 3, rol: 'VENDEDOR', exp: expSegundos })}.firma`;
}

describe('AuthService', () => {
  let servicio: AuthService;
  let http: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    servicio = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('sin sesión no está autenticado', () => {
    expect(servicio.estaAutenticado()).toBe(false);
    expect(servicio.rol()).toBeNull();
  });

  it('iniciarSesion guarda token y usuario, y expone el rol', () => {
    const token = tokenFalso(Math.floor(Date.now() / 1000) + 3600);
    servicio.iniciarSesion('gerente@autoventas.gt', 'Gerente123!').subscribe();
    const req = http.expectOne('/api/auth/login');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ email: 'gerente@autoventas.gt', password: 'Gerente123!' });
    req.flush({
      token,
      expiraEn: '8h',
      usuario: { id: 2, nombre: 'Mariela', email: 'gerente@autoventas.gt', rol: 'GERENTE' },
    });

    expect(localStorage.getItem('av_token')).toBe(token);
    expect(servicio.estaAutenticado()).toBe(true);
    expect(servicio.rol()).toBe('GERENTE');
    expect(servicio.esGerencia()).toBe(true);
    expect(servicio.tieneRol('ADMIN')).toBe(false);
  });

  it('un token vencido no cuenta como sesión válida', () => {
    localStorage.setItem('av_token', tokenFalso(Math.floor(Date.now() / 1000) - 10));
    localStorage.setItem(
      'av_usuario',
      JSON.stringify({ id: 3, nombre: 'C', email: 'c@x.gt', rol: 'VENDEDOR' }),
    );
    const nuevo = TestBed.runInInjectionContext(() => new AuthService());
    expect(nuevo.usuario()?.rol).toBe('VENDEDOR');
    expect(nuevo.estaAutenticado()).toBe(false);
  });

  it('cerrarSesion limpia el almacenamiento y navega al login con mensaje', () => {
    const router = TestBed.inject(Router);
    const navegar = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    localStorage.setItem('av_token', 'x');
    servicio.cerrarSesion('Su sesión expiró.');
    expect(localStorage.getItem('av_token')).toBeNull();
    expect(servicio.usuario()).toBeNull();
    expect(servicio.mensajeLogin()).toBe('Su sesión expiró.');
    expect(navegar).toHaveBeenCalledWith(['/login']);
  });

  it('expiracionToken lee el campo exp y tolera tokens inválidos', () => {
    expect(expiracionToken(tokenFalso(123))).toBe(123);
    expect(expiracionToken('no-es-un-jwt')).toBeNull();
  });
});
