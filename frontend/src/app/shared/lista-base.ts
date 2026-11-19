import { Directive, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, debounceTime } from 'rxjs';
import { ApiService, Parametros, mensajeError } from '../core/api.service';
import { Paginado } from '../core/modelos';

/**
 * Lógica común de los listados: búsqueda con espera (debounce), filtros,
 * paginación y manejo de carga/errores contra un endpoint paginado de la API.
 */
@Directive()
export abstract class ListaBase<T> implements OnInit {
  protected readonly api = inject(ApiService);

  /** Endpoint relativo a /api, p. ej. '/clientes'. */
  protected abstract readonly ruta: string;

  readonly datos = signal<Paginado<T> | null>(null);
  readonly cargando = signal(false);
  readonly error = signal<string | null>(null);

  pagina = 1;
  tamano = 10;
  q = '';
  filtros: Parametros = {};

  private readonly busqueda$ = new Subject<void>();

  constructor() {
    this.busqueda$.pipe(debounceTime(350), takeUntilDestroyed()).subscribe(() => this.filtrar());
  }

  ngOnInit(): void {
    this.cargar();
  }

  /** Llamar en (input) del buscador. */
  buscar(): void {
    this.busqueda$.next();
  }

  /** Aplica filtros desde la primera página. */
  filtrar(): void {
    this.pagina = 1;
    this.cargar();
  }

  limpiarFiltros(): void {
    this.q = '';
    this.filtros = {};
    this.filtrar();
  }

  irAPagina(p: number): void {
    this.pagina = p;
    this.cargar();
  }

  hayFiltros(): boolean {
    return !!this.q || Object.values(this.filtros).some((v) => v !== null && v !== undefined && v !== '');
  }

  cargar(): void {
    this.cargando.set(true);
    this.error.set(null);
    this.api
      .get<Paginado<T>>(this.ruta, {
        ...this.filtros,
        q: this.q.trim(),
        pagina: this.pagina,
        tamano: this.tamano,
      })
      .subscribe({
        next: (d) => {
          this.datos.set(d);
          this.cargando.set(false);
        },
        error: (e) => {
          this.error.set(mensajeError(e, 'No se pudo cargar la información.'));
          this.cargando.set(false);
        },
      });
  }
}
