import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { AuthService } from './auth.service';
import { NotificacionService } from './notificacion.service';

/**
 * Interceptor HTTP:
 *  - agrega el encabezado Authorization: Bearer <token> a las llamadas /api;
 *  - si el servidor responde 401 (token vencido o inválido) cierra la sesión;
 *  - si responde 403 avisa que no hay permisos.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const notificaciones = inject(NotificacionService);
  const token = auth.token;
  const esLogin = req.url.endsWith('/api/auth/login');

  const solicitud =
    token && req.url.startsWith('/api') && !esLogin
      ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
      : req;

  return next(solicitud).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401 && !esLogin) {
        auth.cerrarSesion(error.error?.mensaje || 'Su sesión expiró. Inicie sesión nuevamente.');
      } else if (error.status === 403) {
        notificaciones.error(error.error?.mensaje || 'No tiene permisos para realizar esta acción.');
      } else if (error.status === 0) {
        notificaciones.error('No se pudo conectar con el servidor. Verifique su conexión.');
      }
      return throwError(() => error);
    }),
  );
};
