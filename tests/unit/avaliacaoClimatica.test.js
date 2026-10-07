// Deriva quais alertas (tipo/severidade/mensagem) uma leitura deveria gerar contra a faixa da fruta.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { tiposForaDaFaixa, montarAlertas } = require('../../src/utils/avaliacaoClimatica');

const manga = { temp_min: 20, temp_max: 35, umidade_min: 50, umidade_max: 80 };

test('dentro da faixa: nenhum alerta', () => {
  assert.deepEqual(tiposForaDaFaixa(28, 60, manga), []);
});

test('temperatura acima do ideal', () => {
  assert.deepEqual(tiposForaDaFaixa(40, 60, manga), ['TEMPERATURA_ALTA']);
});

test('temperatura abaixo do ideal', () => {
  assert.deepEqual(tiposForaDaFaixa(10, 60, manga), ['TEMPERATURA_BAIXA']);
});

test('mais de um problema ao mesmo tempo (bate com o exemplo do schema.sql)', () => {
  const tipos = tiposForaDaFaixa(36.4, 45, manga);
  assert.deepEqual(tipos, ['TEMPERATURA_ALTA', 'UMIDADE_BAIXA']);
});

test('montarAlertas gera mensagem e severidade corretas', () => {
  const alertas = montarAlertas({ temperatura: 36.4, umidade: 45, faixa: manga, nomeFruta: 'Manga' });
  assert.equal(alertas.length, 2);
  assert.equal(alertas[0].tipo, 'TEMPERATURA_ALTA');
  assert.equal(alertas[0].severidade, 'ALTA');
  assert.match(alertas[0].mensagem, /Manga/);
  assert.equal(alertas[1].tipo, 'UMIDADE_BAIXA');
  assert.equal(alertas[1].severidade, 'MEDIA');
});

test('nenhum alerta não gera nada a inserir', () => {
  assert.deepEqual(montarAlertas({ temperatura: 25, umidade: 65, faixa: manga, nomeFruta: 'Manga' }), []);
});
