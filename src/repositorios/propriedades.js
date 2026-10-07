const { pool } = require('../config/db');

async function criar({ nome, municipio, uf, latitude, longitude }) {
  const [resultado] = await pool.execute(
    'INSERT INTO propriedade (nome, municipio, uf, latitude, longitude) VALUES (:nome, :municipio, :uf, :latitude, :longitude)',
    { nome, municipio, uf, latitude: latitude ?? null, longitude: longitude ?? null }
  );
  return buscarPorId(resultado.insertId);
}

async function buscarPorId(idPropriedade) {
  const [linhas] = await pool.execute('SELECT * FROM propriedade WHERE id_propriedade = :idPropriedade', { idPropriedade });
  return linhas[0] || null;
}

async function listar({ idUsuario, somenteVinculadas }) {
  if (somenteVinculadas) {
    const [linhas] = await pool.execute(
      `SELECT p.* FROM propriedade p
       JOIN usuario_propriedade up ON up.id_propriedade = p.id_propriedade
       WHERE up.id_usuario = :idUsuario ORDER BY p.nome`,
      { idUsuario }
    );
    return linhas;
  }
  const [linhas] = await pool.execute('SELECT * FROM propriedade ORDER BY nome');
  return linhas;
}

async function atualizar(idPropriedade, dados) {
  const campos = [];
  const valores = { idPropriedade };
  for (const campo of ['nome', 'municipio', 'uf', 'latitude', 'longitude']) {
    if (dados[campo] !== undefined) { campos.push(`${campo} = :${campo}`); valores[campo] = dados[campo]; }
  }
  if (campos.length) await pool.execute(`UPDATE propriedade SET ${campos.join(', ')} WHERE id_propriedade = :idPropriedade`, valores);
  return buscarPorId(idPropriedade);
}

async function excluir(idPropriedade) {
  const [resultado] = await pool.execute('DELETE FROM propriedade WHERE id_propriedade = :idPropriedade', { idPropriedade });
  return resultado.affectedRows > 0;
}

async function usuarioTemAcesso(idUsuario, idPropriedade) {
  const [linhas] = await pool.execute(
    'SELECT 1 FROM usuario_propriedade WHERE id_usuario = :idUsuario AND id_propriedade = :idPropriedade',
    { idUsuario, idPropriedade }
  );
  return linhas.length > 0;
}

async function listarUsuariosVinculados(idPropriedade) {
  const [linhas] = await pool.execute(
    `SELECT u.id_usuario, u.nome, u.email FROM usuario u
     JOIN usuario_propriedade up ON up.id_usuario = u.id_usuario
     WHERE up.id_propriedade = :idPropriedade ORDER BY u.nome`,
    { idPropriedade }
  );
  return linhas;
}

async function vincularUsuario(idPropriedade, idUsuario) {
  await pool.execute(
    'INSERT IGNORE INTO usuario_propriedade (id_usuario, id_propriedade) VALUES (:idUsuario, :idPropriedade)',
    { idUsuario, idPropriedade }
  );
}

async function desvincularUsuario(idPropriedade, idUsuario) {
  await pool.execute(
    'DELETE FROM usuario_propriedade WHERE id_usuario = :idUsuario AND id_propriedade = :idPropriedade',
    { idUsuario, idPropriedade }
  );
}

async function definirUsuariosVinculados(idPropriedade, idsUsuarios) {
  const conexao = await pool.getConnection();
  try {
    await conexao.beginTransaction();
    await conexao.execute('DELETE FROM usuario_propriedade WHERE id_propriedade = :idPropriedade', { idPropriedade });
    for (const idUsuario of idsUsuarios) {
      await conexao.execute(
        'INSERT INTO usuario_propriedade (id_usuario, id_propriedade) VALUES (:idUsuario, :idPropriedade)',
        { idUsuario, idPropriedade }
      );
    }
    await conexao.commit();
  } catch (erro) {
    await conexao.rollback();
    throw erro;
  } finally {
    conexao.release();
  }
}

module.exports = {
  criar, buscarPorId, listar, atualizar, excluir,
  usuarioTemAcesso, listarUsuariosVinculados, vincularUsuario, desvincularUsuario, definirUsuariosVinculados,
};
