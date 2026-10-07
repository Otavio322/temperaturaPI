const { pool } = require('../config/db');

const COM_JUNCOES = `
  SELECT se.*, s.codigo AS setor_codigo, s.id_propriedade, s.id_fruta,
         f.nome AS fruta_nome, f.temp_min, f.temp_max, f.umidade_min, f.umidade_max
  FROM sensor se
  JOIN setor s ON s.id_setor = se.id_setor
  JOIN fruta f ON f.id_fruta = s.id_fruta
`;

async function criar({ idSetor, codigo, thingspeakChannelId, status }) {
  const [resultado] = await pool.execute(
    'INSERT INTO sensor (id_setor, codigo, thingspeak_channel_id, status) VALUES (:idSetor, :codigo, :thingspeakChannelId, :status)',
    { idSetor, codigo, thingspeakChannelId: thingspeakChannelId || null, status: status || 'ATIVO' }
  );
  return buscarPorId(resultado.insertId);
}

async function buscarPorId(idSensor) {
  const [linhas] = await pool.execute(`${COM_JUNCOES} WHERE se.id_sensor = :idSensor`, { idSensor });
  return linhas[0] || null;
}

async function listarPorPropriedade(idPropriedade) {
  const [linhas] = await pool.execute(`${COM_JUNCOES} WHERE s.id_propriedade = :idPropriedade ORDER BY se.codigo`, { idPropriedade });
  return linhas;
}

async function listar() {
  const [linhas] = await pool.execute(`${COM_JUNCOES} ORDER BY se.codigo`);
  return linhas;
}

async function listarAtivos() {
  const [linhas] = await pool.execute(`${COM_JUNCOES} WHERE se.status = 'ATIVO' ORDER BY se.codigo`);
  return linhas;
}

async function atualizar(idSensor, dados) {
  const campos = [];
  const valores = { idSensor };
  for (const [coluna, chave] of [['id_setor', 'idSetor'], ['codigo', 'codigo'], ['thingspeak_channel_id', 'thingspeakChannelId'], ['status', 'status']]) {
    if (dados[chave] !== undefined) { campos.push(`${coluna} = :${chave}`); valores[chave] = dados[chave]; }
  }
  if (campos.length) await pool.execute(`UPDATE sensor SET ${campos.join(', ')} WHERE id_sensor = :idSensor`, valores);
  return buscarPorId(idSensor);
}

async function atualizarUltimaLeitura(idSensor, dataHora) {
  await pool.execute('UPDATE sensor SET ultima_leitura_em = :dataHora WHERE id_sensor = :idSensor', { idSensor, dataHora });
}

async function excluir(idSensor) {
  const [resultado] = await pool.execute('DELETE FROM sensor WHERE id_sensor = :idSensor', { idSensor });
  return resultado.affectedRows > 0;
}

module.exports = { criar, buscarPorId, listarPorPropriedade, listar, listarAtivos, atualizar, atualizarUltimaLeitura, excluir };
