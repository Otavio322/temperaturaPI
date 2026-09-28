
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { evaluate } = require('../../src/utils/status');

const manga = { tempMin: 10, tempMax: 13, humMin: 85, humMax: 90 };

test('sem perfil de fruta, retorna sem_perfil', () => {
  assert.equal(evaluate(12, 88, null).status, 'sem_perfil');
});

test('dentro da faixa ideal, retorna ok', () => {
  assert.deepEqual(evaluate(11, 87, manga), { status: 'ok', issues: [] });
});

test('temperatura acima do ideal gera alerta', () => {
  const r = evaluate(20, 87, manga);
  assert.equal(r.status, 'alerta');
  assert.ok(r.issues.includes('temperatura_alta'));
});

test('mais de um problema ao mesmo tempo', () => {
  const r = evaluate(5, 40, manga);
  assert.equal(r.status, 'alerta');
  assert.ok(r.issues.includes('temperatura_baixa'));
  assert.ok(r.issues.includes('umidade_baixa'));
});
