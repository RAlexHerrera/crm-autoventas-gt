import { Injectable, inject } from '@angular/core';
import { Observable, shareReplay } from 'rxjs';
import { ApiService } from '../core/api.service';
import { Vendedor } from '../core/modelos';

/** Lista de vendedores activos (para filtros y asignaciones), cacheada en memoria. */
@Injectable({ providedIn: 'root' })
export class VendedoresService {
  private readonly api = inject(ApiService);
  private cache$?: Observable<Vendedor[]>;

  lista(): Observable<Vendedor[]> {
    this.cache$ ??= this.api.get<Vendedor[]>('/usuarios/vendedores').pipe(shareReplay(1));
    return this.cache$;
  }

  invalidar(): void {
    this.cache$ = undefined;
  }
}
