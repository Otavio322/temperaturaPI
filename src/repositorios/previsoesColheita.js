const { pool } = require('../config/db');

async function criar({ prediction, fruitName }) {
  const [resultado] = await pool.execute(
    `INSERT INTO previsao_colheita (
       id_fruta, fruta_nome, id_usuario, id_sensor,
       pontuacao_clima, pontuacao_mercado, pontuacao_combinada,
       recomendacao, dias_estimados, janela_inicio, janela_fim, justificativa
     ) VALUES (
       :idFruta, :frutaNome, :idUsuario, :idSensor,
       :pontuacaoClima, :pontuacaoMercado, :pontuacaoCombinada,
       :recomendacao, :diasEstimados, :janelaInicio, :janelaFim, :justificativa
     )`,
    {
      idFruta: prediction.fruitId,
      frutaNome: fruitName,
      idUsuario: prediction.generatedBy,
      idSensor: prediction.deviceId,
      pontuacaoClima: prediction.climateScore,
      pontuacaoMercado: prediction.marketScore,
      pontuacaoCombinada: prediction.combinedScore,
      recomendacao: prediction.recommendation,
      diasEstimados: prediction.days,
      janelaInicio: prediction.windowStart,
      janelaFim: prediction.windowEnd,
      justificativa: prediction.rationale,
    }
  );
  return resultado.insertId;
}

async function listar({ idFruta, limite = 100, idUsuario = null }) {
  const [linhas] = await pool.execute(
    `SELECT id_previsao_colheita, id_fruta, fruta_nome, id_usuario, id_sensor,
            pontuacao_clima, pontuacao_mercado, pontuacao_combinada,
            recomendacao, dias_estimados, janela_inicio, janela_fim,
            justificativa, gerada_em
     FROM previsao_colheita
     WHERE id_fruta = :idFruta
       AND (:idUsuario IS NULL OR id_usuario = :idUsuario)
     ORDER BY gerada_em DESC
     LIMIT :limite`,
    { idFruta, idUsuario, limite }
  );
  return linhas;
}

module.exports = { criar, listar };
