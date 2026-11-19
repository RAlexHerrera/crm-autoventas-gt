import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';

/** Ayuda breve para usar el sistema sin explicación previa. */
@Component({
  selector: 'app-ayuda',
  imports: [RouterLink],
  template: `
    <div class="pagina-encabezado">
      <div>
        <h1>Ayuda</h1>
        <p>Guía rápida del CRM AutoVentas GT.</p>
      </div>
    </div>

    <div class="tarjeta">
      <h2>El proceso de venta en 6 pasos</h2>
      <ol class="pasos">
        <li>
          <strong>Registre el prospecto</strong> en <a routerLink="/prospectos">Prospectos</a>. El sistema
          avisa si el correo o teléfono ya existe.
        </li>
        <li>
          <strong>Cree una oportunidad</strong> desde la ficha del prospecto (o del cliente) indicando el
          vehículo de interés.
        </li>
        <li>
          <strong>Avance las etapas</strong> (Prospección → Contacto → Cotización → Negociación) y registre
          cada llamada o visita en el historial.
        </li>
        <li>
          <strong>Genere la cotización</strong> desde la oportunidad. Solo se pueden cotizar vehículos
          <em>Disponibles</em>. El sistema calcula subtotal, descuentos, IVA 12 % y total.
        </li>
        <li>
          <strong>Marque la cotización</strong> como «Enviada» y luego «El cliente aceptó». Los vehículos
          quedan <em>Reservados</em>.
        </li>
        <li>
          <strong>Registre la venta</strong> desde la cotización aceptada. En una sola operación el vehículo
          pasa a <em>Vendido</em>, la oportunidad a <em>Ganado</em> y el prospecto se convierte en cliente.
        </li>
      </ol>
    </div>

    <div class="rejilla rejilla-2">
      <div class="tarjeta">
        <h2>¿Qué puede hacer su rol?</h2>
        @switch (auth.rol()) {
          @case ('VENDEDOR') {
            <p>
              Como <strong>Vendedor</strong> ve y modifica únicamente sus prospectos, clientes, oportunidades,
              cotizaciones y ventas. Puede consultar todo el catálogo de vehículos. Su página de inicio
              muestra sus propios indicadores.
            </p>
          }
          @case ('GERENTE') {
            <p>
              Como <strong>Gerente Comercial</strong> ve toda la gestión comercial, asigna o reasigna
              vendedores, administra el inventario de vehículos y consulta el dashboard y los
              <a routerLink="/reportes">reportes</a>.
            </p>
          }
          @case ('ADMIN') {
            <p>
              Como <strong>Administrador</strong> gestiona <a routerLink="/usuarios">usuarios y roles</a> y
              tiene acceso completo al resto del sistema.
            </p>
          }
        }
      </div>
      <div class="tarjeta">
        <h2>Estados y significados</h2>
        <dl class="datos-lista">
          <dt>Vehículo</dt>
          <dd>Disponible · Reservado (cotización aceptada) · Vendido</dd>
          <dt>Cotización</dt>
          <dd>Borrador · Enviada · Aceptada · Rechazada · Vencida · Convertida (en venta)</dd>
          <dt>Prospecto</dt>
          <dd>Nuevo · Contactado · Calificado · Convertido · Descartado</dd>
          <dt>Cliente</dt>
          <dd>Nuevo · Regular (1 compra) · Frecuente (2+) · VIP (≥ Q500,000) · Inactivo</dd>
        </dl>
      </div>
    </div>

    <div class="tarjeta">
      <h2>Preguntas frecuentes</h2>
      <details>
        <summary>¿Por qué no puedo cotizar un vehículo?</summary>
        <p>
          Solo se cotizan vehículos «Disponibles». Si está reservado, otra cotización fue aceptada; si está
          vendido, ya no forma parte del inventario.
        </p>
      </details>
      <details>
        <summary>¿Cómo se calcula el total?</summary>
        <p>
          Base imponible = precio − descuento. IVA = base × 12 %. Total = base + IVA. Los precios del catálogo
          no incluyen IVA.
        </p>
      </details>
      <details>
        <summary>Me sale «Ya existe un prospecto o cliente con el mismo correo o teléfono».</summary>
        <p>
          El sistema evita duplicados. Abra el registro existente desde el aviso. Si pertenece a otro
          vendedor, solicite al gerente que lo reasigne.
        </p>
      </details>
      <details>
        <summary>¿Cómo marco una oportunidad como ganada?</summary>
        <p>
          No se marca a mano: se gana automáticamente al registrar la venta desde una cotización aceptada.
        </p>
      </details>
      <details>
        <summary>Mi sesión se cerró sola.</summary>
        <p>
          Por seguridad la sesión expira tras 8 horas. Vuelva a iniciar sesión. Tras 5 intentos fallidos el
          acceso se bloquea 15 minutos.
        </p>
      </details>
      <details>
        <summary>¿Dónde está la documentación técnica de la API?</summary>
        <p>En <a href="/api/docs" target="_blank" rel="noopener">/api/docs</a> (Swagger).</p>
      </details>
    </div>
  `,
  styles: `
    .pasos li {
      margin-bottom: 0.5rem;
    }
    details {
      border-bottom: 1px solid var(--c-borde);
      padding: 0.6rem 0;
    }
    summary {
      cursor: pointer;
      font-weight: 600;
    }
    details p {
      margin: 0.4rem 0 0;
      color: var(--c-texto-suave);
    }
  `,
})
export class AyudaComponent {
  readonly auth = inject(AuthService);
}
