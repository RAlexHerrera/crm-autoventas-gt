import { Routes } from '@angular/router';

export const PROSPECTOS_RUTAS: Routes = [
  {
    path: '',
    title: 'Prospectos — CRM AutoVentas GT',
    loadComponent: () => import('./prospectos-lista.component').then((m) => m.ProspectosListaComponent),
  },
  {
    path: 'nuevo',
    title: 'Nuevo prospecto — CRM AutoVentas GT',
    loadComponent: () => import('./prospecto-form.component').then((m) => m.ProspectoFormComponent),
  },
  {
    path: ':id',
    title: 'Prospecto — CRM AutoVentas GT',
    loadComponent: () => import('./prospecto-detalle.component').then((m) => m.ProspectoDetalleComponent),
  },
  {
    path: ':id/editar',
    title: 'Editar prospecto — CRM AutoVentas GT',
    loadComponent: () => import('./prospecto-form.component').then((m) => m.ProspectoFormComponent),
  },
];
