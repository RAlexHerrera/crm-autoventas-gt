import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-no-encontrado',
  imports: [RouterLink],
  template: `
    <main style="text-align:center; padding: 4rem 1rem">
      <div style="font-size: 3rem" aria-hidden="true">🧭</div>
      <h1>Página no encontrada</h1>
      <p class="texto-suave">La dirección que escribió no existe o fue movida.</p>
      <a routerLink="/inicio" class="btn btn-primario">Ir al inicio</a>
    </main>
  `,
})
export class NoEncontradoComponent {}
