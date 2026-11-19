/**
 * Utilidades comunes para pruebas de API con Supertest.
 */
const request = require('supertest');
const { crearApp } = require('../../src/app');

// Límite de intentos alto para que las pruebas no se bloqueen entre sí.
const app = crearApp({ login: { maxIntentos: 1000, ventanaMinutos: 15 } });

const USUARIOS = {
  admin: { email: 'admin@autoventas.gt', password: 'Admin123!' },
  gerente: { email: 'gerente@autoventas.gt', password: 'Gerente123!' },
  vendedor: { email: 'vendedor@autoventas.gt', password: 'Vendedor123!' }, // id 3
  vendedora2: { email: 'vendedora2@autoventas.gt', password: 'Vendedor123!' }, // id 4
};

async function token(rol) {
  const res = await request(app).post('/api/auth/login').send(USUARIOS[rol]);
  if (res.status !== 200) throw new Error(`No se pudo iniciar sesión como ${rol}: ${res.status}`);
  return res.body.token;
}

/** Cliente HTTP autenticado: api(tok).get('/api/...') */
function api(tok) {
  const agente = request(app);
  const conAuth = (metodo) => (url) => agente[metodo](url).set('Authorization', `Bearer ${tok}`);
  return {
    get: conAuth('get'),
    post: conAuth('post'),
    put: conAuth('put'),
    patch: conAuth('patch'),
    delete: conAuth('delete'),
  };
}

module.exports = { app, request, token, api, USUARIOS };
