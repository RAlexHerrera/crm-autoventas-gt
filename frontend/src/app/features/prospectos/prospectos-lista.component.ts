import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { AuthService } from '../../core/auth.service';
import { ESTADOS_PROSPECTO, FUENTES_PROSPECTO } from '../../core/catalogos';
import { Prospecto } from '../../core/modelos';
import { EstadoVacioComponent, InsigniaComponent, PaginacionComponent } from '../../shared/componentes';
import { ListaBase } from '../../shared/lista-base';
import { FechaGtPipe } from '../../shared/pipes';
import { VendedoresService } from '../../shared/vendedores.service';

/** Listado de prospectos (leads) con filtros (HU-04). */
@Component({
  selector: 'app-prospectos-lista',
  imports: [
    FormsModule,
    RouterLink,
    PaginacionComponent,
    EstadoVacioComponent,
    InsigniaComponent,
    FechaGtPipe,
  ],
  template: `
    <div class="pagina-encabezado">
      <div>
        <h1>Prospectos</h1>
        <p>Personas interesadas que aún no compran. Dé seguimiento y conviértalas en clientes.</p>
      </div>
      <div class="acciones">
        <a routerLink="/prospectos/nuevo" class="btn btn-primario">+ Nuevo prospecto</a>
      </div>
    </div>

    <div class="barra-filtros">
      <div class="campo busqueda">
        <label for="q">Buscar</label>
        <input
          id="q"
          type="search"
          [(ngModel)]="q"
          (input)="buscar()"
          placeholder="Nombre, correo, teléfono o interés"
        />
      </div>
      <div class="campo">
        <label for="estado">Estado</label>
        <select id="estado" [(ngModel)]="filtros['estado']" (change)="filtrar()">
          <option [ngValue]="undefined">Todos</option>
          @for (e of estados; track e) {
            <option [value]="e">{{ e }}</option>
          }
        </select>
      </div>
      <div class="campo">
        <label for="fuente">Fuente</label>
        <select id="fuente" [(ngModel)]="filtros['fuente']" (change)="filtrar()">
          <option [ngValue]="undefined">Todas</option>
          @for (f of fuentes; track f) {
            <option [value]="f">{{ f }}</option>
          }
        </select>
      </div>
      @if (auth.esGerencia()) {
        <div class="campo">
          <label for="vend">Vendedor</label>
          <select id="vend" [(ngModel)]="filtros['vendedorId']" (change)="filtrar()">
            <option [ngValue]="undefined">Todos</option>
            @for (v of vendedores(); track v.id) {
              <option [value]="v.id">{{ v.nombre }}</option>
            }
          </select>
        </div>
      }
      @if (hayFiltros()) {
        <button type="button" class="btn" (click)="limpiarFiltros()">Limpiar filtros</button>
      }
    </div>

    @if (error()) {
      <div class="aviso error">{{ error() }}</div>
    }

    @if (cargando() && !datos()) {
      <div class="cargando">Cargando prospectos…</div>
    } @else if (datos(); as d) {
      @if (d.total === 0) {
        <div class="tarjeta">
          @if (hayFiltros()) {
            <app-estado-vacio
              icono="🔎"
              titulo="Sin resultados"
              mensaje="Ningún prospecto coincide con los filtros."
            />
          } @else {
            <app-estado-vacio
              icono="🎯"
              titulo="No hay prospectos"
              mensaje="Registre a las personas que consultan por un vehículo para darles seguimiento."
            >
              <a routerLink="/prospectos/nuevo" class="btn btn-primario">Registrar prospecto</a>
            </app-estado-vacio>
          }
        </div>
      } @else {
        <div class="tabla-contenedor">
          <table class="tabla">
            <thead>
              <tr>
                <th>Prospecto</th>
                <th>Teléfono</th>
                <th class="oculto-movil">Fuente</th>
                <th class="oculto-movil">Interés</th>
                <th>Estado</th>
                <th class="oculto-movil">Registrado</th>
                @if (auth.esGerencia()) {
                  <th class="oculto-movil">Vendedor</th>
                }
              </tr>
            </thead>
            <tbody>
              @for (p of d.datos; track p.id) {
                <tr>
                  <td>
                    <a [routerLink]="['/prospectos', p.id]">{{ p.nombreCompleto }}</a>
                  </td>
                  <td>{{ p.telefono }}</td>
                  <td class="oculto-movil">{{ p.fuente }}</td>
                  <td class="oculto-movil">{{ p.interes || '—' }}</td>
                  <td><app-insignia [valor]="p.estado" /></td>
                  <td class="oculto-movil">{{ p.creadoEn | fechaGt }}</td>
                  @if (auth.esGerencia()) {
                    <td class="oculto-movil">{{ p.vendedorNombre }}</td>
                  }
                </tr>
              }
            </tbody>
          </table>
        </div>
        <app-paginacion
          [pagina]="d.pagina"
          [paginas]="d.paginas"
          [total]="d.total"
          [tamano]="d.tamano"
          (cambiar)="irAPagina($event)"
        />
      }
    }
  `,
})
export class ProspectosListaComponent extends ListaBase<Prospecto> {
  protected readonly ruta = '/prospectos';
  readonly auth = inject(AuthService);
  readonly estados = ESTADOS_PROSPECTO;
  readonly fuentes = FUENTES_PROSPECTO;
  readonly vendedores = toSignal(inject(VendedoresService).lista(), { initialValue: [] });
}
