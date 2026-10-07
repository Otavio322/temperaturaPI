const { pool } = require('../config/db');

const COM_JUNCOES = `
  SELECT a.*, se.codigo AS sensor_codigo, s.id_propriedade, s.codigo AS setor_codigo, p.nome AS propriedade_nome
  FROM alerta a
  JOIN sensor se ON se.id_sensor = a.id_sensor
  JOIN setor s ON s.id_setor = se.id_setor
  JOIN propriedade p ON p.id_propriedade = s.id_propriedade
`;

async function criar({ idSensor, idLeitura, tipo, severidade, mensagem }) {
  const [resultado] = await pool.execute(
    'INSERT INTO alerta (id_sensor, id_leitura, tipo, severidade, mensagem) VALUES (:idSensor, :idLeitura, :tipo, :severidade, :mensagem)',
    { idSensor, idLeitura: idLeitura || null, tipo, severidade, mensagem }
  );
  const [linhas] = await pool.execute(`${COM_JUNCOES} WHERE a.id_alerta = :id`, { id: resultado.insertId });
  return linhas[0];
}

async function buscarPorId(idAlerta) {
  const [linhas] = await pool.execute(`${COM_JUNCOES} WHERE a.id_alerta = :idAlerta`, { idAlerta });
  return linhas[0] || null;
}

async function listar({ idsPropriedades = null, apenasNaoLidos = false, limite = 50 } = {}) {
  const condicoes = [];
  const valores = { limite };
  if (idsPropriedades) {
    if (!idsPropriedades.length) return []; 
    condicoes.push(`s.id_propriedade IN (${idsPropriedades.map((_, i) => `:prop${i}`).join(',')})`);
    idsPropriedades.forEach((id, i) => { valores[`prop${i}`] = id; });
  }
  if (apenasNaoLidos) condicoes.push('a.lido = FALSE');
  const onde = condicoes.length ? `WHERE ${condicoes.join(' AND ')}` : '';
  const [linhas] = await pool.execute(
    `${COM_JUNCOES} ${onde} ORDER BY a.criado_em DESC LIMIT :limite`,
    valores
  );
  return linhas;
}

async function marcarComoLido(idAlerta) {
  const [resultado] = await pool.execute('UPDATE alerta SET lido = TRUE WHERE id_alerta = :idAlerta', { idAlerta });
  return resultado.affectedRows > 0;
}

async function existeAlertaOfflineNaoLido(idSensor) {
  const [linhas] = await pool.execute(
    `SELECT 1 FROM alerta WHERE id_sensor = :idSensor AND tipo = 'SENSOR_OFFLINE' AND lido = FALSE LIMIT 1`,
    { idSensor }
  );
  return linhas.length > 0;
}

module.exports = { criar, buscarPorId, listar, marcarComoLido, existeAlertaOfflineNaoLido };
