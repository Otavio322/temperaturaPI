
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { cleanReading } = require('../../src/services/dataCleaning');

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
