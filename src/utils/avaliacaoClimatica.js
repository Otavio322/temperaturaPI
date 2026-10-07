function tiposForaDaFaixa(temperatura, umidade, faixa) {
  const tipos = [];
  if (temperatura < faixa.temp_min) tipos.push('TEMPERATURA_BAIXA');
  if (temperatura > faixa.temp_max) tipos.push('TEMPERATURA_ALTA');
  if (umidade < faixa.umidade_min) tipos.push('UMIDADE_BAIXA');
  if (umidade > faixa.umidade_max) tipos.push('UMIDADE_ALTA');
  return tipos;
}

const MENSAGENS = {
  TEMPERATURA_ALTA: (v, fruta) => `Temperatura acima da faixa ideal para ${fruta} (${v.toFixed(1)} C).`,
  TEMPERATURA_BAIXA: (v, fruta) => `Temperatura abaixo da faixa ideal para ${fruta} (${v.toFixed(1)} C).`,
  UMIDADE_ALTA: (v, fruta) => `Umidade acima da faixa ideal para ${fruta} (${v.toFixed(0)}%).`,
  UMIDADE_BAIXA: (v, fruta) => `Umidade abaixo da faixa ideal para ${fruta} (${v.toFixed(0)}%).`,
};

const SEVERIDADE = {
  TEMPERATURA_ALTA: 'ALTA',
  TEMPERATURA_BAIXA: 'ALTA',
  UMIDADE_ALTA: 'MEDIA',
  UMIDADE_BAIXA: 'MEDIA',
  SENSOR_OFFLINE: 'ALTA',
};

function montarAlertas({ temperatura, umidade, faixa, nomeFruta }) {
  return tiposForaDaFaixa(temperatura, umidade, faixa).map((tipo) => ({
    tipo,
    severidade: SEVERIDADE[tipo],
    mensagem: MENSAGENS[tipo](tipo.startsWith('TEMPERATURA') ? temperatura : umidade, nomeFruta),
  }));
}

module.exports = { tiposForaDaFaixa, montarAlertas, MENSAGENS, SEVERIDADE };
