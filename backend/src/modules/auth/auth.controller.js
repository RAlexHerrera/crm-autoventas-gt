/** Controlador HTTP de autenticación. */
const servicio = require('./auth.service');

async function login(req, res) {
  const { email, password } = req.valido.body;
  res.json(await servicio.iniciarSesion(email, password));
}

async function perfil(req, res) {
  res.json(req.usuario);
}

async function cambiarPassword(req, res) {
  const { actual, nueva } = req.valido.body;
  await servicio.cambiarPassword(req.usuario.id, actual, nueva);
  res.json({ mensaje: 'Contraseña actualizada correctamente.' });
}

module.exports = { login, perfil, cambiarPassword };
