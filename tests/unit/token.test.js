process.env.JWT_SECRET = process.env.JWT_SECRET || 'x'.repeat(40);
process.env.DB_USER = process.env.DB_USER || 'climora';
process.env.NODE_ENV = 'test';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const { assinarToken } = require('../../src/utils/token');

test('assinarToken coloca id e perfil no payload', () => {
  const token = assinarToken({ id_usuario: 42, perfil: 'ADMIN' });
  const payload = jwt.verify(token, process.env.JWT_SECRET);
  assert.equal(payload.sub, 42);
  assert.equal(payload.perfil, 'ADMIN');
});

test('token não pode ser verificado com outro segredo', () => {
  const token = assinarToken({ id_usuario: 1, perfil: 'PRODUTOR' });
  assert.throws(() => jwt.verify(token, 'y'.repeat(40)));
});
