/**
 * Configuración centralizada a partir de variables de entorno.
 * No hay credenciales en el código: todo proviene de .env / docker-compose.
 */

function requerida(nombre) {
  const valor = process.env[nombre];
  if (valor === undefined || valor === '') {
    throw new Error(`Falta la variable de entorno obligatoria ${nombre}`);
  }
  return valor;
}

function entero(nombre, porDefecto) {
  const valor = process.env[nombre];
  if (valor === undefined || valor === '') return porDefecto;
  const n = Number.parseInt(valor, 10);
  if (Number.isNaN(n)) throw new Error(`La variable ${nombre} debe ser un número entero`);
  return n;
}

const config = {
  entorno: process.env.NODE_ENV || 'development',
  puerto: entero('PORT', 3000),
  db: {
    host: requerida('DB_HOST'),
    port: entero('DB_PORT', 3306),
    user: requerida('DB_USER'),
    password: requerida('DB_PASSWORD'),
    database: requerida('DB_NAME'),
    connectionLimit: entero('DB_POOL_SIZE', 10),
  },
  jwt: {
    secreto: requerida('JWT_SECRET'),
    expiraEn: process.env.JWT_EXPIRES_IN || '8h',
  },
  corsOrigen: (process.env.CORS_ORIGIN || 'http://localhost:4200')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean),
  login: {
    maxIntentos: entero('LOGIN_MAX_INTENTOS', 5),
    ventanaMinutos: entero('LOGIN_VENTANA_MINUTOS', 15),
  },
  // Supuesto S8 de la Fase 1: IVA del 12 %. Se expresa en puntos básicos (1200 = 12 %).
  ivaPuntosBasicos: entero('IVA_PUNTOS_BASICOS', 1200),
  vigenciaCotizacionDias: entero('VIGENCIA_COTIZACION_DIAS', 15),
};

if (config.jwt.secreto.length < 32 && config.entorno === 'production') {
  throw new Error('JWT_SECRET debe tener al menos 32 caracteres en producción');
}

module.exports = config;
