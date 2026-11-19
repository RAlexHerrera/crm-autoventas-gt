import { Component, computed, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs';
import { AuthService } from '../core/auth.service';
import { ConfirmacionService } from '../core/confirmacion.service';
import { Rol } from '../core/modelos';

interface EnlaceMenu {
  ruta: string;
  texto: string;
  icono: string;
  roles?: Rol[];
}

const MENU: EnlaceMenu[] = [
  { ruta: '/inicio', texto: 'Inicio', icono: '🏠' },
  { ruta: '/prospectos', texto: 'Prospectos', icono: '🎯' },
  { ruta: '/clientes', texto: 'Clientes', icono: '👥' },
  { ruta: '/oportunidades', texto: 'Oportunidades', icono: '📈' },
  { ruta: '/vehiculos', texto: 'Vehículos', icono: '🚗' },
  { ruta: '/cotizaciones', texto: 'Cotizaciones', icono: '🧾' },
  { ruta: '/ventas', texto: 'Ventas', icono: '💰' },
  { ruta: '/reportes', texto: 'Reportes', icono: '📊', roles: ['ADMIN', 'GERENTE'] },
  { ruta: '/usuarios', texto: 'Usuarios y roles', icono: '🔐', roles: ['ADMIN'] },
  { ruta: '/ayuda', texto: 'Ayuda', icono: '❓' },
];

/** Estructura principal: barra lateral con menú según el rol, encabezado y contenido. */
@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <a class="saltar" href="#contenido">Saltar al contenido</a>
    <div class="marco" [class.menu-abierto]="menuAbierto()">
      <aside class="lateral" aria-label="Menú principal">
        <div class="marca">
          <span class="logo" aria-hidden="true">🚙</span>
          <div>
            <strong>AutoVentas GT</strong>
            <small>CRM comercial</small>
          </div>
        </div>
        <nav>
          @for (e of menu(); track e.ruta) {
            <a [routerLink]="e.ruta" routerLinkActive="activo" (click)="menuAbierto.set(false)">
              <span aria-hidden="true">{{ e.icono }}</span> {{ e.texto }}
            </a>
          }
        </nav>
        <div class="pie-lateral texto-pequeno">Moneda: quetzales (Q) · IVA 12 %</div>
      </aside>

      <div class="fondo-menu" (click)="menuAbierto.set(false)" aria-hidden="true"></div>

      <div class="principal">
        <header class="superior">
          <button
            type="button"
            class="btn hamburguesa"
            aria-label="Abrir menú"
            (click)="menuAbierto.set(!menuAbierto())"
          >
            ☰
          </button>
          <div class="titulo-seccion">{{ seccionActual() }}</div>
          <div class="usuario">
            <div class="usuario-datos oculto-movil">
              <strong>{{ auth.usuario()?.nombre }}</strong>
              <small>{{ nombreRol() }}</small>
            </div>
            <a routerLink="/mi-cuenta" class="btn btn-chico" title="Mi cuenta"
              >👤<span class="oculto-movil"> Mi cuenta</span></a
            >
            <button type="button" class="btn btn-chico" (click)="salir()">Salir</button>
          </div>
        </header>
        <main id="contenido" class="contenido" tabindex="-1">
          <router-outlet />
        </main>
      </div>
    </div>
  `,
  styles: `
    .saltar {
      position: absolute;
      left: -999px;
      top: 0;
      background: #fff;
      padding: 0.5rem;
      z-index: 2000;
    }
    .saltar:focus {
      left: 0.5rem;
    }
    .marco {
      display: grid;
      grid-template-columns: 240px 1fr;
      min-height: 100vh;
    }
    .lateral {
      background: #0f1f45;
      color: #dbe4ff;
      display: flex;
      flex-direction: column;
      position: sticky;
      top: 0;
      height: 100vh;
      overflow-y: auto;
    }
    .marca {
      display: flex;
      gap: 0.6rem;
      align-items: center;
      padding: 1rem 1.1rem;
      border-bottom: 1px solid rgb(255 255 255 / 10%);
    }
    .marca .logo {
      font-size: 1.6rem;
    }
    .marca small {
      display: block;
      color: #9fb0d9;
      font-size: 0.75rem;
    }
    nav {
      display: flex;
      flex-direction: column;
      padding: 0.6rem;
      gap: 0.15rem;
      flex: 1;
    }
    nav a {
      color: #dbe4ff;
      text-decoration: none;
      padding: 0.55rem 0.75rem;
      border-radius: 8px;
      display: flex;
      gap: 0.55rem;
    }
    nav a:hover {
      background: rgb(255 255 255 / 8%);
    }
    nav a.activo {
      background: #1d4ed8;
      color: #fff;
      font-weight: 600;
    }
    .pie-lateral {
      padding: 0.8rem 1.1rem;
      color: #9fb0d9;
      border-top: 1px solid rgb(255 255 255 / 10%);
    }
    .principal {
      min-width: 0;
      display: flex;
      flex-direction: column;
    }
    .superior {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.6rem 1.25rem;
      background: #fff;
      border-bottom: 1px solid var(--c-borde);
      position: sticky;
      top: 0;
      z-index: 50;
    }
    .titulo-seccion {
      font-weight: 600;
      flex: 1;
    }
    .usuario {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .usuario-datos {
      text-align: right;
      line-height: 1.2;
    }
    .usuario-datos small {
      display: block;
      color: var(--c-texto-suave);
    }
    .hamburguesa {
      display: none;
    }
    .contenido {
      padding: 1.25rem;
      max-width: 1400px;
      width: 100%;
      outline: none;
    }
    .fondo-menu {
      display: none;
    }
    @media (max-width: 900px) {
      .marco {
        grid-template-columns: 1fr;
      }
      .lateral {
        position: fixed;
        left: 0;
        top: 0;
        width: 260px;
        transform: translateX(-100%);
        transition: transform 0.2s;
        z-index: 200;
      }
      .menu-abierto .lateral {
        transform: none;
      }
      .menu-abierto .fondo-menu {
        display: block;
        position: fixed;
        inset: 0;
        background: rgb(0 0 0 / 40%);
        z-index: 150;
      }
      .hamburguesa {
        display: inline-flex;
      }
      .contenido {
        padding: 0.85rem;
      }
    }
  `,
})
export class ShellComponent {
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly confirmacion = inject(ConfirmacionService);

  readonly menuAbierto = signal(false);
  readonly menu = computed(() => MENU.filter((e) => !e.roles || this.auth.tieneRol(...e.roles)));
  readonly nombreRol = computed(
    () =>
      ({ ADMIN: 'Administrador', GERENTE: 'Gerente Comercial', VENDEDOR: 'Vendedor' })[
        this.auth.rol() ?? 'VENDEDOR'
      ],
  );

  private readonly url = toSignal(
    this.router.events.pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd)),
    { initialValue: null },
  );
  readonly seccionActual = computed(() => {
    const ruta = this.url()?.urlAfterRedirects ?? this.router.url;
    const e = MENU.find((m) => ruta.startsWith(m.ruta));
    return e ? e.texto : ruta.startsWith('/mi-cuenta') ? 'Mi cuenta' : '';
  });

  async salir(): Promise<void> {
    const ok = await this.confirmacion.confirmar({
      titulo: 'Cerrar sesión',
      mensaje: '¿Desea salir del sistema?',
      textoConfirmar: 'Salir',
    });
    if (ok) this.auth.cerrarSesion('Sesión cerrada correctamente.');
  }
}
