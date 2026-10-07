const propriedades = require('../repositorios/propriedades');

const ehAdmin = (usuario) => usuario.perfil === 'ADMIN';

async function idsPropriedadesVisiveis(usuario) {
  if (ehAdmin(usuario)) return null;
  const minhas = await propriedades.listar({ idUsuario: usuario.id_usuario, somenteVinculadas: true });
  return minhas.map((p) => p.id_propriedade);
}

module.exports = { ehAdmin, idsPropriedadesVisiveis };
