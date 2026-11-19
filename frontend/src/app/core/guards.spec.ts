import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, provideRouter, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { autenticadoGuard, invitadoGuard, rolGuard } from './guards';
import { AuthService } from './auth.service';
import { Rol } from './modelos';

describe('Guards de rutas', () => {
  let rolActual: Rol | null;
  const auth = {
    estaAutenticado: vi.fn(),
    tieneRol: (...roles: Rol[]) => !!rolActual && roles.includes(rolActual),
    usuario: () => ({ id: 1 }),
    mensajeLogin: { set: vi.fn() },
  };

  const ejecutar = (guard: typeof autenticadoGuard, data: Record<string, unknown> = {}, url = '/clientes') =>
    TestBed.runInInjectionContext(() =>
      guard({ data } as unknown as ActivatedRouteSnapshot, { url } as RouterStateSnapshot),
    );

  const serializar = (r: unknown) => TestBed.inject(Router).serializeUrl(r as UrlTree);

  beforeEach(() => {
    rolActual = 'VENDEDOR';
    auth.estaAutenticado.mockReset().mockReturnValue(true);
    auth.mensajeLogin.set.mockReset();
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: AuthService, useValue: auth }],
    });
  });

  it('autenticadoGuard deja pasar con sesión válida', () => {
    expect(ejecutar(autenticadoGuard)).toBe(true);
  });

  it('autenticadoGuard redirige a /login conservando la ruta solicitada', () => {
    auth.estaAutenticado.mockReturnValue(false);
    expect(serializar(ejecutar(autenticadoGuard, {}, '/cotizaciones/5'))).toBe(
      '/login?volver=%2Fcotizaciones%2F5',
    );
    expect(auth.mensajeLogin.set).toHaveBeenCalled();
  });

  it('rolGuard permite el acceso al rol autorizado', () => {
    rolActual = 'GERENTE';
    expect(ejecutar(rolGuard, { roles: ['ADMIN', 'GERENTE'] })).toBe(true);
  });

  it('rolGuard bloquea a un vendedor en reportes y lo envía al inicio', () => {
    expect(serializar(ejecutar(rolGuard, { roles: ['ADMIN', 'GERENTE'] }))).toBe('/inicio');
  });

  it('rolGuard sin roles definidos permite el acceso', () => {
    expect(ejecutar(rolGuard, {})).toBe(true);
  });

  it('invitadoGuard envía al inicio a quien ya inició sesión', () => {
    expect(serializar(ejecutar(invitadoGuard))).toBe('/inicio');
    auth.estaAutenticado.mockReturnValue(false);
    expect(ejecutar(invitadoGuard)).toBe(true);
  });
});
