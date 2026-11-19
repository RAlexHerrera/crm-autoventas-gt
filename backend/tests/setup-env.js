/**
 * Variables de entorno por defecto para las pruebas. Dentro de Docker las
 * define docker-compose (servicio backend-test); fuera de Docker se usan
 * estos valores (MySQL del compose publicado en el puerto 3307).
 */
const defecto = {
  NODE_ENV: 'test',
  DB_HOST: '127.0.0.1',
  DB_PORT: '3307',
  DB_USER: 'root',
  DB_PASSWORD: process.env.MYSQL_ROOT_PASSWORD || 'Root_Dev_2026!',
  DB_NAME: 'autoventas_test',
  JWT_SECRET: 'prueba_secreto_jwt_suficientemente_largo_para_tests_0123456789',
  JWT_EXPIRES_IN: '1h',
};
for (const [clave, valor] of Object.entries(defecto)) {
  if (!process.env[clave]) process.env[clave] = valor;
}
// La base de pruebas debe ser SIEMPRE distinta de la de la aplicación.
if (!/_test$/.test(process.env.DB_NAME)) {
  throw new Error('Por seguridad, DB_NAME en pruebas debe terminar en "_test".');
}
