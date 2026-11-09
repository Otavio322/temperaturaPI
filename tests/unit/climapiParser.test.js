const { test } = require('node:test');
const assert = require('node:assert/strict');
const { extrairExecucoes, ultimaExecucao, extrairPontos } = require('../../src/utils/climapiParser');

test('lista de execuções como array de strings devolve a mais recente', () => {
  assert.equal(ultimaExecucao(['2026-11-02', '2026-11-03', '2026-11-01']), '2026-11-03');
});

test('lista de execuções dentro de um objeto', () => {
  assert.deepEqual(extrairExecucoes({ datas: ['20261101', '20261102'] }), ['20261101', '20261102']);
});

test('lista de execuções vazia devolve null', () => {
  assert.equal(ultimaExecucao([]), null);
});

test('extrai pontos com chaves data e valor', () => {
  const pontos = extrairPontos([
    { data: '2026-11-03T06:00:00Z', valor: 27.4 },
    { data: '2026-11-03T12:00:00Z', valor: '31.1' },
  ]);
  assert.equal(pontos.length, 2);
  assert.equal(pontos[1].valor, 31.1);
  assert.equal(pontos[0].validoPara.toISOString(), '2026-11-03T06:00:00.000Z');
});

test('usa o primeiro campo numérico quando a chave de valor é desconhecida', () => {
  const pontos = extrairPontos({ resultado: [{ datahora: '2026-11-03T06:00:00Z', tmax2m: 29.5 }] });
  assert.equal(pontos.length, 1);
  assert.equal(pontos[0].valor, 29.5);
});

test('ignora itens sem data válida ou sem valor numérico', () => {
  const pontos = extrairPontos([
    { data: 'invalida', valor: 10 },
    { data: '2026-11-03T06:00:00Z', valor: null },
    { data: '2026-11-03T12:00:00Z', valor: 20 },
  ]);
  assert.equal(pontos.length, 1);
});

test('resposta desconhecida não gera pontos', () => {
  assert.deepEqual(extrairPontos({ erro: 'x' }), []);
  assert.deepEqual(extrairPontos(null), []);
});
