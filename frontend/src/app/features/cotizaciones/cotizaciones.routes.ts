// Rutas de cotizaciones. Cada pantalla se carga solo cuando se visita (carga diferida).
import { Routes } from '@angular/router';

export const COTIZACIONES_RUTAS: Routes = [
  {
    path: '',
    title: 'Cotizaciones — CRM AutoVentas GT',
    loadComponent: () => import('./cotizaciones-lista.component').then((m) => m.CotizacionesListaComponent),
  },
  {
    path: 'nueva',
    title: 'Nueva cotización — CRM AutoVentas GT',
    loadComponent: () => import('./cotizacion-form.component').then((m) => m.CotizacionFormComponent),
  },
  {
    path: ':id',
    title: 'Cotización — CRM AutoVentas GT',
    loadComponent: () => import('./cotizacion-detalle.component').then((m) => m.CotizacionDetalleComponent),
  },
  {
    path: ':id/editar',
    title: 'Editar cotización — CRM AutoVentas GT',
    loadComponent: () => import('./cotizacion-form.component').then((m) => m.CotizacionFormComponent),
  },
];
