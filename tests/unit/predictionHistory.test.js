process.env.ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'a'.repeat(64);
process.env.JWT_SECRET = process.env.JWT_SECRET || 'x'.repeat(40);
process.env.NODE_ENV = 'test';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { pool } = require('../../src/config/db');
const previsoesColheitaRepo = require('../../src/repositorios/previsoesColheita');
const predictionsRoute = require('../../src/routes/predictions.routes');
const schemas = require('../../src/validators');

function hasGetRoute(router, path) {
  return router.stack.some((layer) => layer.route?.path === path && layer.route.methods.get);
}

test('consulta do histórico exige fruta e define limite padrão', () => {
  const resultado = schemas.predictionHistoryQuery.safeParse({ fruit: '4' });

  assert.equal(resultado.success, true);
  assert.equal(resultado.data.fruit, 4);
  assert.equal(resultado.data.limit, 100);
});

test('endpoint de histórico de previsões está registrado', () => {
  assert.equal(hasGetRoute(predictionsRoute, '/historico'), true);
});

test('grava os campos da previsão de colheita no histórico', async () => {
  const originalExecute = pool.execute;
  const inicio = new Date('2026-11-16T00:00:00.000Z');
  const fim = new Date('2026-11-19T00:00:00.000Z');
  let parametros;

  try {
    pool.execute = async (sql, values) => {
      assert.match(sql, /INSERT INTO previsao_colheita/);
      parametros = values;
      return [{ insertId: 31 }, []];
    };

    const id = await previsoesColheitaRepo.criar({
      fruitName: 'Manga',
      prediction: {
        fruitId: 2,
        generatedBy: 5,
        deviceId: 7,
        climateScore: 80,
        marketScore: 70,
        combinedScore: 77,
        recommendation: 'colher_agora',
        days: 3,
        windowStart: inicio,
        windowEnd: fim,
        rationale: 'Clima e mercado favoráveis.',
      },
    });

    assert.equal(id, 31);
    assert.equal(parametros.idFruta, 2);
    assert.equal(parametros.frutaNome, 'Manga');
    assert.equal(parametros.recomendacao, 'colher_agora');
    assert.equal(parametros.janelaInicio, inicio);
    assert.equal(parametros.janelaFim, fim);
  } finally {
    pool.execute = originalExecute;
  }
});
