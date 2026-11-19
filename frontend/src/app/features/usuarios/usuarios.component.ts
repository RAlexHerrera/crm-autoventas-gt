import { Component, inject, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { erroresCampos, mensajeError } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { ConfirmacionService } from '../../core/confirmacion.service';
import { RolDetalle, Usuario } from '../../core/modelos';
import { NotificacionService } from '../../core/notificacion.service';
import { EstadoVacioComponent, InsigniaComponent, PaginacionComponent } from '../../shared/componentes';
import { ListaBase } from '../../shared/lista-base';
import { FechaGtPipe } from '../../shared/pipes';
import { VendedoresService } from '../../shared/vendedores.service';
import { passwordSegura } from '../mi-cuenta/mi-cuenta.component';

/** Administración de usuarios y roles (HU-01). Solo Administrador. */
@Component({
  selector: 'app-usuarios',
  imports: [
    FormsModule,
    ReactiveFormsModule,
    PaginacionComponent,
    EstadoVacioComponent,
    InsigniaComponent,
    FechaGtPipe,
  ],
  template: `
    <div class="pagina-encabezado">
      <div>
        <h1>Usuarios y roles</h1>
        <p>Cree cuentas, asigne roles y active o desactive el acceso.</p>
      </div>
      @if (pestana() === 'usuarios') {
        <button type="button" class="btn btn-primario" (click)="nuevo()">+ Nuevo usuario</button>
      }
    </div>

    <div class="pestanas" role="tablist">
      <button
        type="button"
        role="tab"
        [class.activa]="pestana() === 'usuarios'"
        [attr.aria-selected]="pestana() === 'usuarios'"
        (click)="pestana.set('usuarios')"
      >
        Usuarios
      </button>
      <button
        type="button"
        role="tab"
        [class.activa]="pestana() === 'roles'"
        [attr.aria-selected]="pestana() === 'roles'"
        (click)="verRoles()"
      >
        Roles y permisos
      </button>
    </div>

    @if (pestana() === 'usuarios') {
      <div class="barra-filtros">
        <div class="campo busqueda">
          <label for="q">Buscar</label>
          <input id="q" type="search" [(ngModel)]="q" (input)="buscar()" placeholder="Nombre o correo" />
        </div>
        <div class="campo">
          <label for="rol">Rol</label>
          <select id="rol" [(ngModel)]="filtros['rol']" (change)="filtrar()">
            <option [ngValue]="undefined">Todos</option>
            <option value="ADMIN">Administrador</option>
            <option value="GERENTE">Gerente Comercial</option>
            <option value="VENDEDOR">Vendedor</option>
          </select>
        </div>
        <div class="campo">
          <label for="activo">Estado</label>
          <select id="activo" [(ngModel)]="filtros['activo']" (change)="filtrar()">
            <option [ngValue]="undefined">Todos</option>
            <option value="true">Activos</option>
            <option value="false">Inactivos</option>
          </select>
        </div>
      </div>

      @if (error()) {
        <div class="aviso error">{{ error() }}</div>
      }
      @if (datos(); as d) {
        @if (d.total === 0) {
          <div class="tarjeta">
            <app-estado-vacio icono="🔐" titulo="Sin usuarios" mensaje="No hay usuarios con esos filtros." />
          </div>
        } @else {
          <div class="tabla-contenedor">
            <table class="tabla">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Correo</th>
                  <th>Rol</th>
                  <th>Estado</th>
                  <th class="oculto-movil">Último acceso</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                @for (u of d.datos; track u.id) {
                  <tr>
                    <td>{{ u.nombre }}</td>
                    <td>{{ u.email }}</td>
                    <td>{{ u.rolNombre }}</td>
                    <td><app-insignia [valor]="u.activo ? 'Activo' : 'Inactivo'" /></td>
                    <td class="oculto-movil">{{ u.ultimoAcceso | fechaGt: true }}</td>
                    <td class="acciones">
                      <button type="button" class="btn btn-chico" (click)="editar(u)">Editar</button>
                      <button type="button" class="btn btn-chico" (click)="restablecer(u)">Contraseña</button>
                      @if (u.id !== auth.usuario()?.id) {
                        <button
                          type="button"
                          class="btn btn-chico"
                          [class.btn-peligro]="u.activo"
                          (click)="alternarActivo(u)"
                        >
                          {{ u.activo ? 'Desactivar' : 'Activar' }}
                        </button>
                      }
                    </td>
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
    } @else {
      <div class="rejilla rejilla-3">
        @for (r of roles(); track r.id) {
          <div class="tarjeta">
            <h2>{{ r.nombre }}</h2>
            <p class="texto-pequeno texto-suave">
              Código: {{ r.codigo }} · {{ r.usuariosActivos }} usuario(s) activo(s)
            </p>
            <label class="campo">
              <span class="texto-pequeno">Nombre visible</span>
              <input [(ngModel)]="r.nombre" maxlength="50" />
            </label>
            <label class="campo">
              <span class="texto-pequeno">Descripción</span>
              <textarea [(ngModel)]="r.descripcion" maxlength="255"></textarea>
            </label>
            <h3 class="permisos-titulo">Permisos (definidos en el servidor)</h3>
            <ul class="texto-pequeno">
              @for (p of permisos[r.codigo]; track p) {
                <li>{{ p }}</li>
              }
            </ul>
            <button type="button" class="btn btn-chico" (click)="guardarRol(r)">Guardar cambios</button>
          </div>
        }
      </div>
    }

    @if (formAbierto()) {
      <div class="dialogo-fondo">
        <form
          class="dialogo"
          role="dialog"
          aria-modal="true"
          aria-labelledby="u-titulo"
          [formGroup]="form"
          (ngSubmit)="guardar()"
          novalidate
        >
          <h2 id="u-titulo">{{ editandoId() ? 'Editar usuario' : 'Nuevo usuario' }}</h2>
          @if (errorForm()) {
            <div class="aviso error">{{ errorForm() }}</div>
          }
          <div class="formulario">
            <div class="campo ancho-completo">
              <label for="u-nombre">Nombre completo <span class="requerido">*</span></label>
              <input id="u-nombre" formControlName="nombre" maxlength="120" />
              @if (campoError('nombre')) {
                <span class="error-campo">{{ campoError('nombre') }}</span>
              }
            </div>
            <div class="campo ancho-completo">
              <label for="u-email">Correo <span class="requerido">*</span></label>
              <input id="u-email" type="email" formControlName="email" maxlength="150" />
              @if (campoError('email')) {
                <span class="error-campo">{{ campoError('email') }}</span>
              }
            </div>
            <div class="campo">
              <label for="u-rol">Rol <span class="requerido">*</span></label>
              <select id="u-rol" formControlName="rolId">
                @for (r of roles(); track r.id) {
                  <option [ngValue]="r.id">{{ r.nombre }}</option>
                }
              </select>
            </div>
            @if (!editandoId()) {
              <div class="campo">
                <label for="u-pass">Contraseña inicial <span class="requerido">*</span></label>
                <input id="u-pass" type="password" formControlName="password" autocomplete="new-password" />
                <span class="ayuda">Mínimo 8 caracteres, con letras y números.</span>
                @if (campoError('password')) {
                  <span class="error-campo">{{ campoError('password') }}</span>
                }
              </div>
            } @else {
              <div class="campo">
                <label for="u-activo">Estado</label>
                <select id="u-activo" formControlName="activo">
                  <option [ngValue]="true">Activo</option>
                  <option [ngValue]="false">Inactivo</option>
                </select>
              </div>
            }
          </div>
          <div class="formulario-acciones">
            <button type="button" class="btn" (click)="formAbierto.set(false)">Cancelar</button>
            <button type="submit" class="btn btn-primario" [disabled]="guardando()">Guardar</button>
          </div>
        </form>
      </div>
    }
  `,
  styles: `
    .permisos-titulo {
      margin-top: 0.8rem;
      font-size: 0.9rem;
    }
    .campo {
      margin-bottom: 0.5rem;
    }
  `,
})
export class UsuariosComponent extends ListaBase<Usuario> {
  protected readonly ruta = '/usuarios';
  readonly auth = inject(AuthService);
  private readonly fb = inject(FormBuilder);
  private readonly confirmacion = inject(ConfirmacionService);
  private readonly notificaciones = inject(NotificacionService);
  private readonly vendedoresServicio = inject(VendedoresService);

  readonly pestana = signal<'usuarios' | 'roles'>('usuarios');
  readonly roles = signal<RolDetalle[]>([]);
  readonly formAbierto = signal(false);
  readonly editandoId = signal<number | null>(null);
  readonly guardando = signal(false);
  readonly errorForm = signal<string | null>(null);
  readonly erroresServidor = signal<Record<string, string>>({});

  readonly permisos: Record<string, string[]> = {
    ADMIN: [
      'Gestiona usuarios y roles',
      'Acceso completo a la gestión comercial',
      'Reportes y dashboard',
      'Inventario de vehículos',
    ],
    GERENTE: [
      'Ve clientes, prospectos, oportunidades, cotizaciones y ventas de todos',
      'Asigna y reasigna vendedores',
      'Registra y edita vehículos',
      'Reportes y dashboard',
    ],
    VENDEDOR: [
      'Ve y modifica solo sus clientes, prospectos y oportunidades',
      'Crea cotizaciones y registra sus ventas',
      'Consulta el catálogo de vehículos',
      'Panel personal de indicadores',
    ],
  };

  readonly form = this.fb.nonNullable.group({
    nombre: ['', [Validators.required, Validators.minLength(3)]],
    email: ['', [Validators.required, Validators.email]],
    rolId: [3, Validators.required],
    password: [''],
    activo: [true],
  });

  constructor() {
    super();
    this.api.get<RolDetalle[]>('/roles').subscribe((r) => this.roles.set(r));
  }

  verRoles(): void {
    this.pestana.set('roles');
    this.api.get<RolDetalle[]>('/roles').subscribe((r) => this.roles.set(r));
  }

  nuevo(): void {
    this.editandoId.set(null);
    this.form.reset({ nombre: '', email: '', rolId: 3, password: '', activo: true });
    this.form.controls.password.setValidators([Validators.required, passwordSegura]);
    this.form.controls.password.updateValueAndValidity();
    this.abrir();
  }

  editar(u: Usuario): void {
    this.editandoId.set(u.id);
    this.form.reset({ nombre: u.nombre, email: u.email, rolId: u.rolId, password: '', activo: u.activo });
    this.form.controls.password.clearValidators();
    this.form.controls.password.updateValueAndValidity();
    this.abrir();
  }

  private abrir(): void {
    this.errorForm.set(null);
    this.erroresServidor.set({});
    this.formAbierto.set(true);
  }

  campoError(campo: string): string | null {
    const s = this.erroresServidor()[campo];
    if (s) return s;
    const c = this.form.get(campo);
    if (!c || !c.touched || c.valid) return null;
    if (c.hasError('required')) return 'Este campo es obligatorio.';
    if (c.hasError('email')) return 'Correo inválido.';
    if (c.hasError('debil')) return 'Mínimo 8 caracteres, con letras y números.';
    return 'Valor inválido.';
  }

  guardar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.guardando.set(true);
    const v = this.form.getRawValue();
    const id = this.editandoId();
    const solicitud = id
      ? this.api.put<Usuario>(`/usuarios/${id}`, {
          nombre: v.nombre,
          email: v.email,
          rolId: v.rolId,
          activo: v.activo,
        })
      : this.api.post<Usuario>('/usuarios', {
          nombre: v.nombre,
          email: v.email,
          rolId: v.rolId,
          password: v.password,
        });
    solicitud.subscribe({
      next: () => {
        this.guardando.set(false);
        this.formAbierto.set(false);
        this.vendedoresServicio.invalidar();
        this.notificaciones.exito(id ? 'Usuario actualizado.' : 'Usuario creado.');
        this.cargar();
      },
      error: (e) => {
        this.guardando.set(false);
        this.erroresServidor.set(erroresCampos(e));
        this.errorForm.set(mensajeError(e));
      },
    });
  }

  async restablecer(u: Usuario): Promise<void> {
    const nueva = window.prompt(`Nueva contraseña para ${u.nombre} (mínimo 8 caracteres, letras y números):`);
    if (!nueva) return;
    this.api.patch(`/usuarios/${u.id}/password`, { password: nueva }).subscribe({
      next: () =>
        this.notificaciones.exito('Contraseña restablecida. Comuníquela al usuario de forma segura.'),
      error: (e) => this.notificaciones.error(mensajeError(e)),
    });
  }

  async alternarActivo(u: Usuario): Promise<void> {
    const ok = await this.confirmacion.confirmar({
      titulo: u.activo ? 'Desactivar usuario' : 'Activar usuario',
      mensaje: u.activo
        ? `${u.nombre} ya no podrá iniciar sesión y su sesión actual se cerrará. Sus registros se conservan; reasígnelos si es necesario.`
        : `${u.nombre} podrá volver a iniciar sesión.`,
      textoConfirmar: u.activo ? 'Desactivar' : 'Activar',
      peligro: u.activo,
    });
    if (!ok) return;
    this.api
      .patch<{
        asignacionesPendientes: { clientes: number; prospectos: number; oportunidades: number } | null;
      }>(`/usuarios/${u.id}/activo`, { activo: !u.activo })
      .subscribe({
        next: (r) => {
          const a = r.asignacionesPendientes;
          this.notificaciones.exito(
            a && a.clientes + a.prospectos + a.oportunidades > 0
              ? `Usuario desactivado. Tiene ${a.clientes} clientes, ${a.prospectos} prospectos y ${a.oportunidades} oportunidades por reasignar.`
              : u.activo
                ? 'Usuario desactivado.'
                : 'Usuario activado.',
          );
          this.vendedoresServicio.invalidar();
          this.cargar();
        },
        error: (e) => this.notificaciones.error(mensajeError(e)),
      });
  }

  guardarRol(r: RolDetalle): void {
    this.api.put<RolDetalle>(`/roles/${r.id}`, { nombre: r.nombre, descripcion: r.descripcion }).subscribe({
      next: () => this.notificaciones.exito('Rol actualizado.'),
      error: (e) => this.notificaciones.error(mensajeError(e)),
    });
  }
}
