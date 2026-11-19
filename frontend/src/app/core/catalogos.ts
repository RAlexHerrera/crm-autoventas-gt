/** Valores fijos compartidos con el backend (deben coincidir con los CHECK de la base de datos). */

export const CLASIFICACIONES = ['Nuevo', 'Regular', 'Frecuente', 'VIP', 'Inactivo'] as const;
export const FUENTES_PROSPECTO = [
  'Sitio web',
  'Referido',
  'Redes sociales',
  'Visita en agencia',
  'Llamada',
  'Feria',
] as const;
export const ESTADOS_PROSPECTO = ['Nuevo', 'Contactado', 'Calificado', 'Convertido', 'Descartado'] as const;
export const ETAPAS = ['Prospección', 'Contacto', 'Cotización', 'Negociación', 'Ganado', 'Perdido'] as const;
export const ETAPAS_ABIERTAS = ['Prospección', 'Contacto', 'Cotización', 'Negociación'] as const;
export const TIPOS_INTERACCION = [
  'Llamada',
  'Correo',
  'WhatsApp',
  'Visita',
  'Reunión',
  'Prueba de manejo',
  'Nota',
] as const;
export const ESTADOS_COTIZACION = [
  'Borrador',
  'Enviada',
  'Aceptada',
  'Rechazada',
  'Vencida',
  'Convertida',
] as const;
export const METODOS_PAGO = ['Contado', 'Financiamiento', 'Transferencia', 'Cheque'] as const;

/** Transiciones de cotización permitidas manualmente (igual que en el backend). */
export const TRANSICIONES_COTIZACION: Record<string, string[]> = {
  Borrador: ['Enviada'],
  Enviada: ['Aceptada', 'Rechazada'],
  Aceptada: ['Rechazada'],
};

/** Color de insignia según el estado / etapa / clasificación. */
export function colorEstado(valor: string | null | undefined): string {
  switch (valor) {
    case 'Disponible':
    case 'Activo':
    case 'Ganado':
    case 'Aceptada':
    case 'Convertida':
    case 'Convertido':
    case 'VIP':
      return 'verde';
    case 'Reservado':
    case 'Negociación':
    case 'Enviada':
    case 'Calificado':
    case 'Frecuente':
      return 'amarilla';
    case 'Vendido':
    case 'Perdido':
    case 'Rechazada':
    case 'Descartado':
    case 'Inactivo':
      return 'roja';
    case 'Cotización':
    case 'Contactado':
    case 'Regular':
      return 'azul';
    case 'Contacto':
    case 'Nuevo':
      return 'celeste';
    case 'Vencida':
    case 'Borrador':
    case 'Prospección':
      return '';
    default:
      return 'morada';
  }
}
