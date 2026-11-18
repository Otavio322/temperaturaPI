process.env.DB_USER = 'test_user';
process.env.JWT_SECRET = 'abcdefghijklmnopqrstuvwxzy123456';
process.env.DB_HOST = 'localhost';
process.env.DB_NAME = 'climora_test';
process.env.THINGSPEAK_BASE_URL = 'https://api.thingspeak.com';
process.env.THINGSPEAK_SIMULATE_SEM_CANAL = 'true';
process.env.NODE_ENV = 'test';

const test = require('node:test');
const assert = require('node:assert/strict');

const { buscarFeeds, buscarHistorico, simularFeeds, ErroThingSpeak } = require('../../src/services/thingspeak');
const leiturasRoute = require('../../src/routes/leituras.routes');
const schemas = require('../../src/validators');

test('simularFeeds gera temperatura e umidade plausíveis para o ThingSpeak simulado', () => {
  const feeds = simularFeeds();

  assert.equal(Array.isArray(feeds), true);
  assert.equal(feeds.length >= 1, true);
  assert.ok(Number.isFinite(Number(feeds[0].field1)));
  assert.ok(Number.isFinite(Number(feeds[0].field2)));
  assert.ok(Number(feeds[0].field1) >= -40 && Number(feeds[0].field1) <= 80);
  assert.ok(Number(feeds[0].field2) >= 0 && Number(feeds[0].field2) <= 100);
});

test('buscarFeeds sem canal usa a simulação do ThingSpeak', async () => {
  const feeds = await buscarFeeds({});

  assert.equal(Array.isArray(feeds), true);
  assert.ok(feeds[0]);
  assert.ok(Number.isFinite(Number(feeds[0].field1)));
  assert.ok(Number.isFinite(Number(feeds[0].field2)));
});

test('buscarHistorico lê canal cadastrado, normaliza campos e inclui dados anteriores a 30 dias', async (context) => {
  const fetchOriginal = global.fetch;
  context.after(() => { global.fetch = fetchOriginal; });
  let urlSolicitada;
  global.fetch = async (url) => {
    urlSolicitada = url;
    return {
      ok: true,
      json: async () => ({
        feeds: [
          { created_at: '2026-09-10T12:00:00Z', field1: '20', field2: '50', field3: '23', field4: '18', field5: '21' },
          { created_at: '2026-11-10T12:00:00Z', field1: '30', field2: '70', field3: '32', field4: '28', field5: '30' },
          { created_at: 'data-invalida', field1: '25', field2: '60' },
          { created_at: '2026-11-11T12:00:00Z', field1: 'inválido', field2: '60' },
        ],
      }),
    };
  };

  const historico = await buscarHistorico({ thingspeak_channel_id: '3493151' });

  assert.match(urlSolicitada, /\/channels\/3493151\/feeds\.json\?results=8000$/);
  assert.deepEqual(historico.canal, {
    temperatura: 'field1', umidade: 'field2', maxima: 'field3', minima: 'field4', media: 'field5',
  });
  assert.equal(historico.quantidade, 2);
  assert.equal(historico.leituras[0].medido_em, '2026-09-10T12:00:00.000Z');
  assert.deepEqual(historico.leituras[1], {
    medido_em: '2026-11-10T12:00:00.000Z',
    temperatura: 30,
    umidade: 70,
    maxima: 32,
    minima: 28,
    media: 30,
  });
  assert.deepEqual(historico.estatisticas.temperatura, { minima: 20, maxima: 30, media: 25 });
  assert.deepEqual(historico.estatisticas.umidade, { minima: 50, maxima: 70, media: 60 });
});

test('buscarHistorico não simula nem consulta um canal arbitrário quando o sensor não tem canal', async (context) => {
  const fetchOriginal = global.fetch;
  context.after(() => { global.fetch = fetchOriginal; });
  global.fetch = async () => { throw new Error('não deveria consultar'); };

  await assert.rejects(() => buscarHistorico({}), ErroThingSpeak);
});

test('rota de histórico ThingSpeak existe e rejeita parâmetros de canal enviados pelo cliente', () => {
  const rotaRegistrada = leiturasRoute.stack.some((layer) =>
    layer.route?.path === '/:idSensor/thingspeak' && layer.route.methods.get
  );
  assert.equal(rotaRegistrada, true);
  assert.equal(schemas.consultaHistoricoThingSpeak.safeParse({ channelId: '3493151' }).success, false);
});
