process.env.JWT_SECRET = process.env.JWT_SECRET || 'x'.repeat(40);
process.env.ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'a'.repeat(64);
process.env.NODE_ENV = 'test';

const { test } = require('node:test');
const assert = require('node:assert/strict');

const app = require('../../src/app');
const lgpdRoutes = require('../../src/routes/lgpd.routes');

function hasRoute(router, method, path) {
  return router.stack.some((layer) => {
    if (!layer.route) return false;
    return layer.route.path === path && layer.route.methods[method];
  });
}

test('app monta rotas de lgpd', () => {
  const mounted = app._router.stack.some((layer) => layer.name === 'router' && layer.regexp && layer.regexp.test('/api/lgpd'));
  assert.equal(mounted, true);
  assert.equal(hasRoute(lgpdRoutes, 'get', '/me/data'), true);
  assert.equal(hasRoute(lgpdRoutes, 'delete', '/me'), true);
});
