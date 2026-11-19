import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ConfirmacionComponent, NotificacionesComponent } from './shared/componentes';

/** Componente raíz: enrutador + notificaciones y diálogo de confirmación globales. */
@Component({
  selector: 'app-root',
  imports: [RouterOutlet, NotificacionesComponent, ConfirmacionComponent],
  template: `
    <router-outlet />
    <app-notificaciones />
    <app-confirmacion />
  `,
})
export class App {}
