// Rutas de vehículos. Registrar y editar solo para gerente y administrador (el backend también lo valida).
import { Routes } from '@angular/router';
import { rolGuard } from '../../core/guards';

export const VEHICULOS_RUTAS: Routes = [
  {
    path: '',
    title: 'Vehículos — CRM AutoVentas GT',
    loadComponent: () => import('./vehiculos-lista.component').then((m) => m.VehiculosListaComponent),
  },
  {
    path: 'nuevo',
    title: 'Nuevo vehículo — CRM AutoVentas GT',
    canActivate: [rolGuard],
    data: { roles: ['ADMIN', 'GERENTE'] },
    loadComponent: () => import('./vehiculo-form.component').then((m) => m.VehiculoFormComponent),
  },
  {
    path: ':id',
    title: 'Vehículo — CRM AutoVentas GT',
    loadComponent: () => import('./vehiculo-detalle.component').then((m) => m.VehiculoDetalleComponent),
  },
  {
    path: ':id/editar',
    title: 'Editar vehículo — CRM AutoVentas GT',
    canActivate: [rolGuard],
    data: { roles: ['ADMIN', 'GERENTE'] },
    loadComponent: () => import('./vehiculo-form.component').then((m) => m.VehiculoFormComponent),
  },
];
