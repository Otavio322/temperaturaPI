
process.env.ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'a'.repeat(64);
process.env.JWT_SECRET = process.env.JWT_SECRET || 'x'.repeat(40);
process.env.MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:1/test';
process.env.NODE_ENV = 'test';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { generatePrediction, recommendationFor } = require('../../src/services/prediction');
const { emitirAlertaJanelaIdeal } = require('../../src/services/harvestAlerts');
const sensoresRepo = require('../../src/repositorios/sensores');
const alertasRepo = require('../../src/repositorios/alertas');

test('pontuação alta recomenda colher agora', () => {
  assert.equal(recommendationFor(90).recommendation, 'colher_agora');
});

test('pontuação intermediária recomenda monitorar', () => {
  assert.equal(recommendationFor(60).recommendation, 'monitorar');
});

test('pontuação baixa recomenda aguardar', () => {
  assert.equal(recommendationFor(20).recommendation, 'aguardar');
});

test('limiares calibrados alteram a recomendação', () => {
  assert.equal(recommendationFor(70, { harvestThreshold: 80, monitorThreshold: 60 }).recommendation, 'monitorar');
});

test('previsão aplica peso de clima configurado e deriva o peso de mercado', async () => {
  const prediction = await generatePrediction({
    fruitId: 2,
    fruit: { tempMin: 10, tempMax: 30, humMin: 40, humMax: 80 },
    readings: [{ temperature: 20, humidity: 60 }],
    modelConfig: { climateWeight: 0.8, harvestThreshold: 95, monitorThreshold: 60 },
  });

  assert.equal(prediction.climateScore, 100);
  assert.equal(prediction.marketScore, 50);
  assert.equal(prediction.combinedScore, 90);
  assert.equal(prediction.recommendation, 'monitorar');
  assert.equal(prediction.modelConfig.marketWeight, 0.2);
});

test('emite alerta quando a previsão identifica janela ideal', async () => {
  const originalListar = sensoresRepo.listarAtivosPorFruta;
  const originalExiste = alertasRepo.existeAlertaJanelaIdealNaoLido;
  const originalCriar = alertasRepo.criar;
  const criados = [];
  let propriedadesConsultadas;

  try {
    sensoresRepo.listarAtivosPorFruta = async (idFruta, idsPropriedades) => {
      propriedadesConsultadas = idsPropriedades;
      assert.equal(idFruta, 2);
      return [{ id_sensor: 7 }, { id_sensor: 8 }];
    };
    alertasRepo.existeAlertaJanelaIdealNaoLido = async () => false;
    alertasRepo.criar = async (alerta) => { criados.push(alerta); };

    const emitidos = await emitirAlertaJanelaIdeal(
      { recommendation: 'colher_agora', fruitId: 2, days: 3 },
      { idsPropriedades: [4], nomeFruta: 'Manga' }
    );

    assert.equal(emitidos, 2);
    assert.deepEqual(propriedadesConsultadas, [4]);
    assert.deepEqual(criados.map((alerta) => alerta.idSensor), [7, 8]);
    assert.ok(criados.every((alerta) => alerta.tipo === 'JANELA_COLHEITA_IDEAL'));
    assert.ok(criados.every((alerta) => alerta.mensagem.includes('Manga')));
  } finally {
    sensoresRepo.listarAtivosPorFruta = originalListar;
    alertasRepo.existeAlertaJanelaIdealNaoLido = originalExiste;
    alertasRepo.criar = originalCriar;
  }
});

test('não duplica alerta de janela ideal ainda não lido', async () => {
  const originalListar = sensoresRepo.listarAtivosPorFruta;
  const originalExiste = alertasRepo.existeAlertaJanelaIdealNaoLido;
  const originalCriar = alertasRepo.criar;
  let criado = false;

  try {
    sensoresRepo.listarAtivosPorFruta = async () => [{ id_sensor: 7 }];
    alertasRepo.existeAlertaJanelaIdealNaoLido = async () => true;
    alertasRepo.criar = async () => { criado = true; };

    const emitidos = await emitirAlertaJanelaIdeal(
      { recommendation: 'colher_agora', fruitId: 2, days: 3 },
      { nomeFruta: 'Manga' }
    );

    assert.equal(emitidos, 0);
    assert.equal(criado, false);
  } finally {
    sensoresRepo.listarAtivosPorFruta = originalListar;
    alertasRepo.existeAlertaJanelaIdealNaoLido = originalExiste;
    alertasRepo.criar = originalCriar;
  }
});

test('não emite alerta quando a previsão não indica colher agora', async () => {
  const originalListar = sensoresRepo.listarAtivosPorFruta;
  let consultouSensores = false;

  try {
    sensoresRepo.listarAtivosPorFruta = async () => {
      consultouSensores = true;
      return [];
    };

    const emitidos = await emitirAlertaJanelaIdeal(
      { recommendation: 'monitorar', fruitId: 2, days: 7 },
      { nomeFruta: 'Manga' }
    );

    assert.equal(emitidos, 0);
    assert.equal(consultouSensores, false);
  } finally {
    sensoresRepo.listarAtivosPorFruta = originalListar;
  }
});
