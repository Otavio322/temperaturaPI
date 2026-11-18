const alertasRepo = require('../repositorios/alertas');
const sensoresRepo = require('../repositorios/sensores');

async function emitirAlertaJanelaIdeal(prediction, { idsPropriedades = null, nomeFruta } = {}) {
  if (prediction?.recommendation !== 'colher_agora') return 0;

  const sensores = await sensoresRepo.listarAtivosPorFruta(prediction.fruitId, idsPropriedades);
  let emitidos = 0;

  for (const sensor of sensores) {
    if (await alertasRepo.existeAlertaJanelaIdealNaoLido(sensor.id_sensor)) continue;

    await alertasRepo.criar({
      idSensor: sensor.id_sensor,
      idLeitura: null,
      tipo: 'JANELA_COLHEITA_IDEAL',
      severidade: 'ALTA',
      mensagem: `Condições favoráveis para colheita/exportação de ${nomeFruta} identificadas. Janela estimada: próximos ${prediction.days} dias.`,
    });
    emitidos += 1;
  }

  return emitidos;
}

module.exports = { emitirAlertaJanelaIdeal };
