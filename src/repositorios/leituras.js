const { pool } = require('../config/db');

const ERRO_DUPLICADO = 'ER_DUP_ENTRY';

async function criarSeNova({ idSensor, medidoEm, temperatura, umidade, valida }) {
  try {
    const [resultado] = await pool.execute(
      'INSERT INTO leitura_climatica (id_sensor, medido_em, temperatura, umidade, valida) VALUES (:idSensor, :medidoEm, :temperatura, :umidade, :valida)',
      { idSensor, medidoEm, temperatura, umidade, valida }
    );
    const [linhas] = await pool.execute('SELECT * FROM leitura_climatica WHERE id_leitura = :id', { id: resultado.insertId });
    return linhas[0];
  } catch (erro) {
    if (erro.code === ERRO_DUPLICADO) return null; 
    throw erro;
  }
}

async function maisRecenteValida(idSensor) {
  const [linhas] = await pool.execute(
    'SELECT * FROM leitura_climatica WHERE id_sensor = :idSensor AND valida = TRUE ORDER BY medido_em DESC LIMIT 1',
    { idSensor }
  );
  return linhas[0] || null;
}

async function historicoAgregado(idSensor, desde, numeroDeBaldes) {
  const [linhas] = await pool.execute(
    `SELECT
       FROM_UNIXTIME(FLOOR(UNIX_TIMESTAMP(medido_em) / :tamanhoBaldeSeg) * :tamanhoBaldeSeg) AS balde,
       ROUND(AVG(temperatura), 1) AS temperatura,
       ROUND(AVG(umidade), 1) AS umidade
     FROM leitura_climatica
     WHERE id_sensor = :idSensor AND valida = TRUE AND medido_em >= :desde
     GROUP BY balde
     ORDER BY balde`,
    { idSensor, desde, tamanhoBaldeSeg: Math.max(1, Math.floor((Date.now() - desde.getTime()) / 1000 / Math.max(numeroDeBaldes, 1))) }
  );
  return linhas;
}

async function excluirPorSensor(idSensor) {
  const [resultado] = await pool.execute('DELETE FROM leitura_climatica WHERE id_sensor = :idSensor', { idSensor });
  return resultado.affectedRows;
}

module.exports = { criarSeNova, maisRecenteValida, historicoAgregado, excluirPorSensor };
