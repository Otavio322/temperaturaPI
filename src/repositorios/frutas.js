const { pool } = require('../config/db');

async function criar({ nome, tempMin, tempMax, umidadeMin, umidadeMax }) {
  const [resultado] = await pool.execute(
    'INSERT INTO fruta (nome, temp_min, temp_max, umidade_min, umidade_max) VALUES (:nome, :tempMin, :tempMax, :umidadeMin, :umidadeMax)',
    { nome, tempMin, tempMax, umidadeMin, umidadeMax }
  );
  return buscarPorId(resultado.insertId);
}

async function buscarPorId(idFruta) {
  const [linhas] = await pool.execute('SELECT * FROM fruta WHERE id_fruta = :idFruta', { idFruta });
  return linhas[0] || null;
}

async function listar() {
  const [linhas] = await pool.execute('SELECT * FROM fruta ORDER BY nome');
  return linhas;
}

async function atualizar(idFruta, dados) {
  const campos = [];
  const valores = { idFruta };
  for (const [coluna, chave] of [['nome', 'nome'], ['temp_min', 'tempMin'], ['temp_max', 'tempMax'], ['umidade_min', 'umidadeMin'], ['umidade_max', 'umidadeMax']]) {
    if (dados[chave] !== undefined) { campos.push(`${coluna} = :${chave}`); valores[chave] = dados[chave]; }
  }
  if (campos.length) await pool.execute(`UPDATE fruta SET ${campos.join(', ')} WHERE id_fruta = :idFruta`, valores);
  return buscarPorId(idFruta);
}

async function excluir(idFruta) {
  const [resultado] = await pool.execute('DELETE FROM fruta WHERE id_fruta = :idFruta', { idFruta });
  return resultado.affectedRows > 0;
}

async function estaEmUso(idFruta) {
  const [linhas] = await pool.execute('SELECT 1 FROM setor WHERE id_fruta = :idFruta LIMIT 1', { idFruta });
  return linhas.length > 0;
}

module.exports = { criar, buscarPorId, listar, atualizar, excluir, estaEmUso };
