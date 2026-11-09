const { pool } = require('../config/db');

async function propriedadesParaColeta() {
  const [linhas] = await pool.execute(
    `SELECT p.id_propriedade, p.latitude, p.longitude
     FROM propriedade p
     WHERE p.latitude IS NOT NULL AND p.longitude IS NOT NULL
       AND EXISTS (
         SELECT 1 FROM setor s JOIN sensor se ON se.id_setor = s.id_setor
         WHERE s.id_propriedade = p.id_propriedade AND se.status = 'ATIVO'
       )`
  );
  return linhas.map((l) => ({ id_propriedade: l.id_propriedade, latitude: Number(l.latitude), longitude: Number(l.longitude) }));
}

async function minutosDesdeUltimaColeta() {
  const [linhas] = await pool.execute('SELECT TIMESTAMPDIFF(MINUTE, MAX(coletado_em), NOW()) AS minutos FROM climapi_coleta');
  const minutos = linhas[0] && linhas[0].minutos;
  return minutos === null || minutos === undefined ? null : Number(minutos);
}

async function coletaExiste({ idPropriedade, variavel, execucao }) {
  const [linhas] = await pool.execute(
    'SELECT 1 FROM climapi_coleta WHERE id_propriedade = :idPropriedade AND variavel = :variavel AND execucao = :execucao LIMIT 1',
    { idPropriedade, variavel, execucao }
  );
  return linhas.length > 0;
}

async function salvarColeta({ idPropriedade, variavel, execucao, resposta }) {
  const [resultado] = await pool.execute(
    'INSERT IGNORE INTO climapi_coleta (id_propriedade, variavel, execucao, resposta) VALUES (:idPropriedade, :variavel, :execucao, :resposta)',
    { idPropriedade, variavel, execucao, resposta: JSON.stringify(resposta) }
  );
  return resultado.insertId || null;
}

async function salvarPontos(idColeta, pontos) {
  if (!pontos.length) return 0;
  const linhas = pontos.map((p) => [idColeta, p.validoPara, p.valor]);
  const [resultado] = await pool.query('INSERT IGNORE INTO climapi_ponto (id_coleta, valido_para, valor) VALUES ?', [linhas]);
  return resultado.affectedRows;
}

async function listarColetasBrutas() {
  const [linhas] = await pool.execute('SELECT id_coleta, variavel, resposta FROM climapi_coleta ORDER BY id_coleta');
  return linhas.map((l) => ({ ...l, resposta: typeof l.resposta === 'string' ? JSON.parse(l.resposta) : l.resposta }));
}

async function limparPontos() {
  const [resultado] = await pool.execute('DELETE FROM climapi_ponto');
  return resultado.affectedRows;
}

module.exports = { propriedadesParaColeta, minutosDesdeUltimaColeta, coletaExiste, salvarColeta, salvarPontos, listarColetasBrutas, limparPontos };
