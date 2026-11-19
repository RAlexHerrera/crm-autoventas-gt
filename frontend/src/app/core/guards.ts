import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';
import { Rol } from './modelos';
import { NotificacionService } from './notificacion.service';

/** Exige sesión válida; si no, redirige a /login conservando la ruta solicitada. */
export const autenticadoGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  if (auth.estaAutenticado()) return true;
  if (auth.usuario()) auth.mensajeLogin.set('Su sesión expiró. Inicie sesión nuevamente.');
  return inject(Router).createUrlTree(['/login'], { queryParams: { volver: state.url } });
};

/**
 * Exige uno de los roles indicados en `data.roles` de la ruta.
 * Es una comodidad de interfaz: el backend vuelve a validar cada permiso.
 */
export const rolGuard: CanActivateFn = (route) => {
  const auth = inject(AuthService);
  const roles = (route.data['roles'] as Rol[] | undefined) ?? [];
  if (roles.length === 0 || auth.tieneRol(...roles)) return true;
  inject(NotificacionService).error('No tiene permisos para acceder a esa sección.');
  return inject(Router).createUrlTree(['/inicio']);
};

/** Evita mostrar el login a quien ya inició sesión. */
export const invitadoGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  return auth.estaAutenticado() ? inject(Router).createUrlTree(['/inicio']) : true;
};
