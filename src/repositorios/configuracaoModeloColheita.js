const { pool } = require('../config/db');

function mapearConfiguracao(linha) {
  if (!linha) return null;
  const pesoClima = Number(linha.peso_clima);
  return {
    pesoClima,
    pesoMercado: Number((1 - pesoClima).toFixed(3)),
    limiarColher: Number(linha.limiar_colher),
    limiarMonitorar: Number(linha.limiar_monitorar),
    atualizadoPor: linha.atualizado_por == null ? null : Number(linha.atualizado_por),
    atualizadoEm: linha.atualizado_em,
  };
}

async function buscar() {
  const [linhas] = await pool.execute(
    `SELECT peso_clima, limiar_colher, limiar_monitorar, atualizado_por, atualizado_em
     FROM configuracao_modelo_colheita
     WHERE id_modelo = 1`
  );
  return mapearConfiguracao(linhas[0]);
}

async function atualizar({ pesoClima, limiarColher, limiarMonitorar, idUsuario }) {
  await pool.execute(
    `UPDATE configuracao_modelo_colheita
     SET peso_clima = :pesoClima,
         limiar_colher = :limiarColher,
         limiar_monitorar = :limiarMonitorar,
         atualizado_por = :idUsuario
     WHERE id_modelo = 1`,
    { pesoClima, limiarColher, limiarMonitorar, idUsuario }
  );
  return buscar();
}

module.exports = { buscar, atualizar };
