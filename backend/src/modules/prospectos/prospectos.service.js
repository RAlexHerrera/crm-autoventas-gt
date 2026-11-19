/** Gestión de prospectos (HU-04 registro y duplicados, HU-05 asignación). */
const repo = require('./prospectos.repository');
const clientesRepo = require('../clientes/clientes.repository');
const usuariosRepo = require('../usuarios/usuarios.repository');
const interaccionesRepo = require('../interacciones/interacciones.repository');
const { enTransaccion } = require('../../db/pool');
const { esVendedor, vendedorDeAlcance } = require('../../middleware/auth');
const { respuestaPaginada } = require('../../utils/paginacion');
const { normalizarTelefono } = require('../../utils/texto');
const { noEncontrado, solicitudInvalida, conflicto, prohibido } = require('../../utils/errores');

async function listar(usuario, filtros) {
  const f = { ...filtros, vendedorId: vendedorDeAlcance(usuario, filtros.vendedorId) };
  const { datos, total } = await repo.listar(f);
  return respuestaPaginada(datos, total, filtros);
}

async function obtener(usuario, id) {
  const p = await repo.obtener(id);
  if (!p || (esVendedor(usuario) && p.vendedorId !== usuario.id)) {
    throw noEncontrado('El prospecto no existe o no está asignado a usted.');
  }
  return p;
}

/**
 * Devuelve los posibles duplicados. A un vendedor no se le muestran datos de
 * contacto de registros ajenos (solo nombre y vendedor responsable).
 */
async function verificarDuplicados(usuario, { email, telefono, excluirProspectoId }) {
  const duplicados = await repo.buscarDuplicados({
    email: email || null,
    telefonoNormalizado: normalizarTelefono(telefono) || null,
    excluirProspectoId,
  });
  return duplicados.map((d) =>
    esVendedor(usuario) && d.vendedorId !== usuario.id ? { ...d, email: null, telefono: null } : d,
  );
}

async function exigirSinDuplicados(usuario, datos, excluirProspectoId) {
  const duplicados = await verificarDuplicados(usuario, { ...datos, excluirProspectoId });
  if (duplicados.length > 0) {
    throw conflicto('Ya existe un prospecto o cliente con el mismo correo o teléfono.', { duplicados });
  }
}

async function resolverVendedor(usuario, vendedorId) {
  if (esVendedor(usuario)) {
    if (vendedorId && vendedorId !== usuario.id) {
      throw prohibido('Solo el gerente o el administrador pueden asignar prospectos a otro vendedor.');
    }
    return usuario.id;
  }
  if (!vendedorId) throw solicitudInvalida('Seleccione el vendedor responsable del prospecto.');
  if (!(await usuariosRepo.esVendedorActivo(vendedorId))) {
    throw solicitudInvalida('El vendedor seleccionado no existe o está inactivo.');
  }
  return vendedorId;
}

async function crear(usuario, datos) {
  if (datos.estado === 'Convertido') {
    throw solicitudInvalida(
      'Un prospecto se convierte en cliente con la acción «Convertir en cliente» o al vender.',
    );
  }
  await exigirSinDuplicados(usuario, datos);
  const vendedorId = await resolverVendedor(usuario, datos.vendedorId);
  const id = await repo.crear({
    ...datos,
    telefonoNormalizado: normalizarTelefono(datos.telefono),
    vendedorId,
    creadoPor: usuario.id,
  });
  return repo.obtener(id);
}

async function actualizar(usuario, id, datos) {
  const actual = await obtener(usuario, id);
  if (actual.estado === 'Convertido' && datos.estado !== 'Convertido') {
    throw conflicto('El prospecto ya fue convertido en cliente; actualice los datos en el cliente.');
  }
  if (actual.estado !== 'Convertido' && datos.estado === 'Convertido') {
    throw solicitudInvalida('Use la acción «Convertir en cliente» para convertir el prospecto.');
  }
  await exigirSinDuplicados(usuario, datos, id);
  await repo.actualizar(id, { ...datos, telefonoNormalizado: normalizarTelefono(datos.telefono) });
  return repo.obtener(id);
}

/** HU-05: asignación de vendedor (solo gerente/administrador, validado en rutas). */
async function asignar(usuario, id, vendedorId) {
  const actual = await obtener(usuario, id);
  if (!(await usuariosRepo.esVendedorActivo(vendedorId))) {
    throw solicitudInvalida('El vendedor seleccionado no existe o está inactivo.');
  }
  if (actual.vendedorId === vendedorId) return actual;
  const nuevo = await usuariosRepo.obtener(vendedorId);
  await enTransaccion(async (conn) => {
    await repo.asignar(id, vendedorId, conn);
    await interaccionesRepo.crear(
      {
        prospectoId: id,
        usuarioId: usuario.id,
        tipo: 'Sistema',
        descripcion: `Prospecto reasignado de ${actual.vendedorNombre} a ${nuevo.nombre} por ${usuario.nombre}.`,
      },
      conn,
    );
  });
  return repo.obtener(id);
}

/**
 * Convierte un prospecto en cliente dentro de una transacción existente.
 * Si ya fue convertido devuelve el cliente vinculado; si existe un cliente con
 * el mismo correo, lo vincula en lugar de duplicarlo. Usado por HU-10 (venta).
 * @returns {Promise<number>} id del cliente
 */
async function convertirEnCliente(conn, prospectoId, datosCliente = {}, usuarioId) {
  const p = await repo.obtener(prospectoId, conn, true);
  if (!p) throw noEncontrado('El prospecto no existe.');
  if (p.clienteId) return p.clienteId;

  const existente = await clientesRepo.buscarPorEmail(p.email, conn);
  const clienteId = existente
    ? existente.id
    : await clientesRepo.crear(
        {
          nombres: p.nombres,
          apellidos: p.apellidos,
          telefono: p.telefono,
          email: p.email,
          dpi: datosCliente.dpi,
          nit: datosCliente.nit,
          direccion: datosCliente.direccion,
          clasificacion: 'Nuevo',
          vendedorId: p.vendedorId,
          prospectoOrigenId: p.id,
        },
        conn,
      );
  await repo.marcarConvertido(p.id, clienteId, conn);
  await interaccionesRepo.crear(
    {
      clienteId,
      prospectoId: p.id,
      usuarioId,
      tipo: 'Sistema',
      descripcion: existente
        ? 'Prospecto vinculado a un cliente existente con el mismo correo.'
        : 'Prospecto convertido en cliente.',
    },
    conn,
  );
  return clienteId;
}

/** Conversión manual de prospecto a cliente (desde la pantalla del prospecto). */
async function convertir(usuario, id, datosCliente) {
  const p = await obtener(usuario, id);
  if (p.estado === 'Convertido') throw conflicto('El prospecto ya fue convertido en cliente.');
  if (p.estado === 'Descartado') throw conflicto('No se puede convertir un prospecto descartado.');
  const clienteId = await enTransaccion((conn) => convertirEnCliente(conn, id, datosCliente, usuario.id));
  return { clienteId, prospecto: await repo.obtener(id) };
}

async function eliminar(usuario, id) {
  const p = await obtener(usuario, id);
  if (p.estado === 'Convertido' || (await repo.contarOportunidades(id)) > 0) {
    throw conflicto(
      'No se puede eliminar: el prospecto tiene oportunidades o ya es cliente. Puede marcarlo como Descartado.',
    );
  }
  await repo.eliminar(id);
}

module.exports = {
  listar,
  obtener,
  verificarDuplicados,
  crear,
  actualizar,
  asignar,
  convertirEnCliente,
  convertir,
  eliminar,
};
