import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { authInterceptor } from './auth.interceptor';
import { AuthService } from './auth.service';
import { NotificacionService } from './notificacion.service';

describe('authInterceptor', () => {
  let http: HttpClient;
  let control: HttpTestingController;
  const auth = { token: 'abc' as string | null, cerrarSesion: vi.fn() };
  const notificaciones = { error: vi.fn() };

  beforeEach(() => {
    auth.token = 'abc';
    auth.cerrarSesion.mockReset();
    notificaciones.error.mockReset();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: auth },
        { provide: NotificacionService, useValue: notificaciones },
      ],
    });
    http = TestBed.inject(HttpClient);
    control = TestBed.inject(HttpTestingController);
  });

  afterEach(() => control.verify());

  it('agrega el encabezado Authorization a las llamadas /api', () => {
    http.get('/api/clientes').subscribe();
    expect(control.expectOne('/api/clientes').request.headers.get('Authorization')).toBe('Bearer abc');
  });

  it('no envía el token al iniciar sesión', () => {
    http.post('/api/auth/login', {}).subscribe();
    expect(control.expectOne('/api/auth/login').request.headers.has('Authorization')).toBe(false);
  });

  it('cierra la sesión cuando la API responde 401', () => {
    http.get('/api/clientes').subscribe({ error: () => undefined });
    control
      .expectOne('/api/clientes')
      .flush({ mensaje: 'Su sesión expiró.' }, { status: 401, statusText: 'Unauthorized' });
    expect(auth.cerrarSesion).toHaveBeenCalledWith('Su sesión expiró.');
  });

  it('muestra un aviso cuando la API responde 403', () => {
    http.get('/api/usuarios').subscribe({ error: () => undefined });
    control
      .expectOne('/api/usuarios')
      .flush({ mensaje: 'No tiene permisos.' }, { status: 403, statusText: 'Forbidden' });
    expect(notificaciones.error).toHaveBeenCalledWith('No tiene permisos.');
    expect(auth.cerrarSesion).not.toHaveBeenCalled();
  });
});
