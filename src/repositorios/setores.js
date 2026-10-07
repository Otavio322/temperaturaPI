const { pool } = require('../config/db');

const COM_JUNCOES = `
  SELECT s.*, f.nome AS fruta_nome, f.temp_min, f.temp_max, f.umidade_min, f.umidade_max,
         p.nome AS propriedade_nome
  FROM setor s
  JOIN fruta f ON f.id_fruta = s.id_fruta
  JOIN propriedade p ON p.id_propriedade = s.id_propriedade
`;

async function criar({ idPropriedade, idFruta, codigo, areaHa }) {
  const [resultado] = await pool.execute(
    'INSERT INTO setor (id_propriedade, id_fruta, codigo, area_ha) VALUES (:idPropriedade, :idFruta, :codigo, :areaHa)',
    { idPropriedade, idFruta, codigo, areaHa }
  );
  return buscarPorId(resultado.insertId);
}

async function buscarPorId(idSetor) {
  const [linhas] = await pool.execute(`${COM_JUNCOES} WHERE s.id_setor = :idSetor`, { idSetor });
  return linhas[0] || null;
}

async function listarPorPropriedade(idPropriedade) {
  const [linhas] = await pool.execute(`${COM_JUNCOES} WHERE s.id_propriedade = :idPropriedade ORDER BY s.codigo`, { idPropriedade });
  return linhas;
}

async function listar() {
  const [linhas] = await pool.execute(`${COM_JUNCOES} ORDER BY p.nome, s.codigo`);
  return linhas;
}

async function atualizar(idSetor, dados) {
  const campos = [];
  const valores = { idSetor };
  for (const [coluna, chave] of [['id_fruta', 'idFruta'], ['codigo', 'codigo'], ['area_ha', 'areaHa']]) {
    if (dados[chave] !== undefined) { campos.push(`${coluna} = :${chave}`); valores[chave] = dados[chave]; }
  }
  if (campos.length) await pool.execute(`UPDATE setor SET ${campos.join(', ')} WHERE id_setor = :idSetor`, valores);
  return buscarPorId(idSetor);
}

async function excluir(idSetor) {
  const [resultado] = await pool.execute('DELETE FROM setor WHERE id_setor = :idSetor', { idSetor });
  return resultado.affectedRows > 0;
}

module.exports = { criar, buscarPorId, listarPorPropriedade, listar, atualizar, excluir };
