
process.env.JWT_SECRET = process.env.JWT_SECRET || 'x'.repeat(40);
process.env.DB_USER = process.env.DB_USER || 'climora';
process.env.NODE_ENV = 'test';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { cleanReading } = require('../../src/services/dataCleaning');
const { consultarSensor } = require('../../src/services/poller');
const leiturasRepo = require('../../src/repositorios/leituras');
const alertasRepo = require('../../src/repositorios/alertas');
const sensoresRepo = require('../../src/repositorios/sensores');
const thingspeak = require('../../src/services/thingspeak');

test('aceita e arredonda uma leitura fisicamente plausível', () => {
  const r = cleanReading({ temperature: 12.34, humidity: 88.96 }, null);
  assert.equal(r.ok, true);
  assert.equal(r.temperature, 12.3);
  assert.equal(r.humidity, 89);
  assert.deepEqual(r.flags, []);
});

test('descarta temperatura fora do intervalo físico possível', () => {
  const r = cleanReading({ temperature: 200, humidity: 50 }, null);
  assert.equal(r.ok, false);
  assert.equal(r.reason, 'valor_fora_do_intervalo_fisico');
});

test('descarta umidade negativa', () => {
  const r = cleanReading({ temperature: 20, humidity: -5 }, null);
  assert.equal(r.ok, false);
});

test('sinaliza salto abrupto de temperatura em relação à leitura anterior', () => {
  const r = cleanReading({ temperature: 40, humidity: 50 }, { temperature: 10, humidity: 50 });
  assert.equal(r.ok, true);
  assert.ok(r.flags.includes('salto_temperatura'));
});

test('não sinaliza quando a variação é pequena', () => {
  const r = cleanReading({ temperature: 12, humidity: 88 }, { temperature: 11.5, humidity: 87 });
  assert.deepEqual(r.flags, []);
});

test('consultarSensor grava leitura inválida com valida=false sem disparar alerta', async () => {
  const originalBuscarFeeds = thingspeak.buscarFeeds;
  const originalMaisRecenteValida = leiturasRepo.maisRecenteValida;
  const originalCriarSeNova = leiturasRepo.criarSeNova;
  const originalCriarAlerta = alertasRepo.criar;
  const originalAtualizarUltimaLeitura = sensoresRepo.atualizarUltimaLeitura;
  let payloadPersistido;

  try {
    thingspeak.buscarFeeds = async () => [{ created_at: '2024-01-01T00:00:00.000Z', field1: 200, field2: 35 }];
    leiturasRepo.maisRecenteValida = async () => null;
    leiturasRepo.criarSeNova = async (payload) => {
      payloadPersistido = payload;
      return { id_leitura: 99, ...payload };
    };
    alertasRepo.criar = async () => { throw new Error('alerta não deveria ser gerado'); };
    sensoresRepo.atualizarUltimaLeitura = async () => {};

    const resultado = await consultarSensor({
      id_sensor: 7,
      fruta_nome: 'Manga',
      temp_min: 20,
      temp_max: 30,
      umidade_min: 40,
      umidade_max: 60,
    });

    assert.equal(resultado.gravadas, 1);
    assert.equal(payloadPersistido.valida, false);
    assert.equal(payloadPersistido.temperatura, 200);
    assert.equal(payloadPersistido.umidade, 35);
  } finally {
    thingspeak.buscarFeeds = originalBuscarFeeds;
    leiturasRepo.maisRecenteValida = originalMaisRecenteValida;
    leiturasRepo.criarSeNova = originalCriarSeNova;
    alertasRepo.criar = originalCriarAlerta;
    sensoresRepo.atualizarUltimaLeitura = originalAtualizarUltimaLeitura;
  }
});
