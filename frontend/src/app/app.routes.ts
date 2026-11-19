import { Routes } from '@angular/router';
import { autenticadoGuard, invitadoGuard, rolGuard } from './core/guards';
import { ShellComponent } from './layout/shell.component';

const GERENCIA = ['ADMIN', 'GERENTE'];

/**
 * Rutas de la aplicación. Cada sección se carga bajo demanda (lazy loading).
 * Las restricciones por rol son de interfaz; el backend vuelve a validarlas.
 */
export const routes: Routes = [
  {
    path: 'login',
    canActivate: [invitadoGuard],
    title: 'Iniciar sesión — CRM AutoVentas GT',
    loadComponent: () => import('./features/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: '',
    component: ShellComponent,
    canActivate: [autenticadoGuard],
    canActivateChild: [rolGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'inicio' },
      {
        path: 'inicio',
        title: 'Inicio — CRM AutoVentas GT',
        loadComponent: () => import('./features/inicio/inicio.component').then((m) => m.InicioComponent),
      },
      {
        path: 'clientes',
        loadChildren: () => import('./features/clientes/clientes.routes').then((m) => m.CLIENTES_RUTAS),
      },
      {
        path: 'prospectos',
        loadChildren: () => import('./features/prospectos/prospectos.routes').then((m) => m.PROSPECTOS_RUTAS),
      },
      {
        path: 'oportunidades',
        loadChildren: () =>
          import('./features/oportunidades/oportunidades.routes').then((m) => m.OPORTUNIDADES_RUTAS),
      },
      {
        path: 'vehiculos',
        loadChildren: () => import('./features/vehiculos/vehiculos.routes').then((m) => m.VEHICULOS_RUTAS),
      },
      {
        path: 'cotizaciones',
        loadChildren: () =>
          import('./features/cotizaciones/cotizaciones.routes').then((m) => m.COTIZACIONES_RUTAS),
      },
      {
        path: 'ventas',
        loadChildren: () => import('./features/ventas/ventas.routes').then((m) => m.VENTAS_RUTAS),
      },
      {
        path: 'reportes',
        title: 'Reportes — CRM AutoVentas GT',
        data: { roles: GERENCIA },
        loadComponent: () =>
          import('./features/reportes/reportes.component').then((m) => m.ReportesComponent),
      },
      {
        path: 'usuarios',
        title: 'Usuarios y roles — CRM AutoVentas GT',
        data: { roles: ['ADMIN'] },
        loadComponent: () =>
          import('./features/usuarios/usuarios.component').then((m) => m.UsuariosComponent),
      },
      {
        path: 'mi-cuenta',
        title: 'Mi cuenta — CRM AutoVentas GT',
        loadComponent: () =>
          import('./features/mi-cuenta/mi-cuenta.component').then((m) => m.MiCuentaComponent),
      },
      {
        path: 'ayuda',
        title: 'Ayuda — CRM AutoVentas GT',
        loadComponent: () => import('./features/ayuda/ayuda.component').then((m) => m.AyudaComponent),
      },
    ],
  },
  {
    path: '**',
    title: 'Página no encontrada — CRM AutoVentas GT',
    loadComponent: () => import('./features/no-encontrado.component').then((m) => m.NoEncontradoComponent),
  },
];
