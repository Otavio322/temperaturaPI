process.env.JWT_SECRET = process.env.JWT_SECRET || 'x'.repeat(40);
process.env.ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'a'.repeat(64);
process.env.NODE_ENV = 'test';

const { test } = require('node:test');
const assert = require('node:assert/strict');

const app = require('../../src/app');
const relatoriosRoutes = require('../../src/routes/relatorios.routes');
const { resumirJUnit } = require('../../src/utils/junitReport');

function hasRoute(router, method, path) {
  return router.stack.some((layer) => {
    if (!layer.route) return false;
    return layer.route.path === path && layer.route.methods[method];
  });
}

test('app monta rotas de relatórios e aliases compatíveis', () => {
  const mounted = app._router.stack.some((layer) => layer.name === 'router' && layer.regexp && layer.regexp.test('/api/reports'));
  assert.equal(mounted, true);
  assert.equal(hasRoute(relatoriosRoutes, 'get', '/seguranca'), true);
  assert.equal(hasRoute(relatoriosRoutes, 'get', '/qualidade'), true);
  assert.equal(hasRoute(relatoriosRoutes, 'get', '/qualidade/junit'), true);
});

test('resumirJUnit calcula testes aprovados, falhas, erros e ignorados', () => {
  const xml = `<testsuites>
    <testcase name="ok" />
    <testcase name="falha"><failure message="falhou" /></testcase>
    <testcase name="erro"><error message="erro" /></testcase>
    <testcase name="ignorado"><skipped /></testcase>
  </testsuites>`;

  assert.deepEqual(resumirJUnit(xml), {
    testes: 4,
    aprovados: 1,
    falhas: 1,
    erros: 1,
    ignorados: 1,
    taxaSucesso: 25,
  });
});

test('resumirJUnit rejeita conteúdo que não é um relatório JUnit', () => {
  assert.throws(() => resumirJUnit('<html>indisponível</html>'), /JUnit é inválido/);
  assert.throws(() => resumirJUnit('<testsuites><testcase name="incompleto" />'), /JUnit é inválido/);
});
