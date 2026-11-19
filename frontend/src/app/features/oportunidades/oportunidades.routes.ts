import { Routes } from '@angular/router';

export const OPORTUNIDADES_RUTAS: Routes = [
  {
    path: '',
    title: 'Oportunidades — CRM AutoVentas GT',
    loadComponent: () => import('./oportunidades-lista.component').then((m) => m.OportunidadesListaComponent),
  },
  {
    path: 'nueva',
    title: 'Nueva oportunidad — CRM AutoVentas GT',
    loadComponent: () => import('./oportunidad-form.component').then((m) => m.OportunidadFormComponent),
  },
  {
    path: ':id',
    title: 'Oportunidad — CRM AutoVentas GT',
    loadComponent: () => import('./oportunidad-detalle.component').then((m) => m.OportunidadDetalleComponent),
  },
  {
    path: ':id/editar',
    title: 'Editar oportunidad — CRM AutoVentas GT',
    loadComponent: () => import('./oportunidad-form.component').then((m) => m.OportunidadFormComponent),
  },
];
