/**
 * Tipos de datos que intercambia la interfaz con la API REST.
 */

export type Rol = 'ADMIN' | 'GERENTE' | 'VENDEDOR';

export interface UsuarioSesion {
  id: number;
  nombre: string;
  email: string;
  rol: Rol;
  rolNombre?: string;
}

export interface RespuestaLogin {
  token: string;
  expiraEn: string;
  usuario: UsuarioSesion;
}

export interface Paginado<T> {
  datos: T[];
  total: number;
  pagina: number;
  tamano: number;
  paginas: number;
}

export interface Usuario {
  id: number;
  nombre: string;
  email: string;
  activo: boolean;
  rolId: number;
  rol: Rol;
  rolNombre: string;
  ultimoAcceso: string | null;
  creadoEn: string;
}

export interface RolDetalle {
  id: number;
  codigo: Rol;
  nombre: string;
  descripcion: string | null;
  usuariosActivos: number;
}

export interface Vendedor {
  id: number;
  nombre: string;
}

export type Clasificacion = 'Nuevo' | 'Regular' | 'Frecuente' | 'VIP' | 'Inactivo';

export interface Cliente {
  id: number;
  nombres: string;
  apellidos: string;
  nombreCompleto: string;
  dpi: string | null;
  nit: string;
  telefono: string;
  email: string | null;
  direccion: string | null;
  clasificacion: Clasificacion;
  vendedorId: number;
  vendedorNombre: string;
  prospectoOrigenId: number | null;
  compras: number;
  totalComprado?: number;
  ultimaCompra?: string | null;
  creadoEn: string;
}

export interface Prospecto {
  id: number;
  nombres: string;
  apellidos: string;
  nombreCompleto: string;
  telefono: string;
  email: string | null;
  fuente: string;
  interes: string | null;
  estado: string;
  vendedorId: number;
  vendedorNombre: string;
  clienteId: number | null;
  oportunidadesAbiertas?: number;
  creadoEn: string;
}

export interface Duplicado {
  tipo: 'prospecto' | 'cliente';
  id: number;
  nombre: string;
  email: string | null;
  telefono: string | null;
  estado: string;
  vendedorId: number;
  vendedorNombre: string;
  coincidencia: string;
}

export interface Interaccion {
  id: number;
  tipo: string;
  descripcion: string;
  fecha: string;
  clienteId: number | null;
  prospectoId: number | null;
  oportunidadId: number | null;
  oportunidadTitulo?: string | null;
  usuarioNombre: string;
}

export type Etapa = 'Prospección' | 'Contacto' | 'Cotización' | 'Negociación' | 'Ganado' | 'Perdido';

export interface Oportunidad {
  id: number;
  titulo: string;
  etapa: Etapa;
  montoEstimado: number;
  fechaCierreEstimada: string | null;
  motivoPerdida: string | null;
  cerradaEn: string | null;
  prospectoId: number | null;
  clienteId: number | null;
  contactoNombre: string;
  contactoTipo: 'Cliente' | 'Prospecto';
  vehiculoInteresId: number | null;
  vehiculoInteres: string | null;
  vendedorId: number;
  vendedorNombre: string;
  creadoEn: string;
  cotizaciones?: CotizacionResumen[];
}

export interface ResumenEtapa {
  etapa: Etapa;
  cantidad: number;
  monto: number;
}

export interface Vehiculo {
  id: number;
  vin: string;
  marca: string;
  modelo: string;
  anio: number;
  version: string | null;
  tipo: string;
  condicion: 'Nuevo' | 'Usado';
  color: string;
  transmision: string;
  combustible: string;
  motor: string | null;
  kilometraje: number;
  precio: number;
  estado: 'Disponible' | 'Reservado' | 'Vendido';
  reservadoCotizacionId: number | null;
  descripcion: string | null;
  vinDigitoVerificadorValido?: boolean;
  creadoEn: string;
}

export interface CatalogosVehiculo {
  marcas: string[];
  tipos: string[];
  condiciones: string[];
  transmisiones: string[];
  combustibles: string[];
  estados: string[];
}

export interface CotizacionResumen {
  id: number;
  correlativo: string;
  fecha: string;
  vigenciaHasta: string;
  total: number;
  estado: string;
}

export interface LineaCotizacion {
  id: number;
  vehiculoId: number;
  precioUnitario: number;
  descuento: number;
  subtotal: number;
  vin: string;
  marca: string;
  modelo: string;
  anio: number;
  version: string | null;
  color: string;
  condicion: string;
  vehiculoEstado: string;
}

export interface Cotizacion extends CotizacionResumen {
  oportunidadId: number;
  oportunidadTitulo: string;
  oportunidadEtapa: Etapa;
  clienteId: number | null;
  prospectoId: number | null;
  contactoNombre: string;
  contactoTipo: 'Cliente' | 'Prospecto';
  contactoEmail: string | null;
  contactoTelefono: string | null;
  vendedorId: number;
  vendedorNombre: string;
  subtotal: number;
  descuento: number;
  baseImponible: number;
  ivaTasa: number;
  iva: number;
  observaciones: string | null;
  cantidadVehiculos: number;
  ventaId: number | null;
  lineas?: LineaCotizacion[];
}

export interface Venta {
  id: number;
  correlativo: string;
  fecha: string;
  metodoPago: string;
  total: number;
  observaciones: string | null;
  cotizacionId: number;
  cotizacionCorrelativo: string;
  oportunidadId: number;
  clienteId: number;
  clienteNombre: string;
  vendedorId: number;
  vendedorNombre: string;
  vehiculos: string;
  detalleVehiculos?: {
    id: number;
    vin: string;
    marca: string;
    modelo: string;
    anio: number;
    color: string;
    precioFinal: number;
  }[];
}

export interface ErrorApi {
  mensaje: string;
  errores?: { campo: string; mensaje: string }[];
  duplicados?: Duplicado[];
}
