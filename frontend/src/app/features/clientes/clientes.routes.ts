// Rutas de clientes. Cada pantalla se carga solo cuando se visita (carga diferida).
import { Routes } from '@angular/router';

export const CLIENTES_RUTAS: Routes = [
  {
    path: '',
    title: 'Clientes — CRM AutoVentas GT',
    loadComponent: () => import('./clientes-lista.component').then((m) => m.ClientesListaComponent),
  },
  {
    path: 'nuevo',
    title: 'Nuevo cliente — CRM AutoVentas GT',
    loadComponent: () => import('./cliente-form.component').then((m) => m.ClienteFormComponent),
  },
  {
    path: ':id',
    title: 'Cliente — CRM AutoVentas GT',
    loadComponent: () => import('./cliente-detalle.component').then((m) => m.ClienteDetalleComponent),
  },
  {
    path: ':id/editar',
    title: 'Editar cliente — CRM AutoVentas GT',
    loadComponent: () => import('./cliente-form.component').then((m) => m.ClienteFormComponent),
  },
];
