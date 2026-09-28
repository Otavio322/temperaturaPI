
process.env.ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'a'.repeat(64);
process.env.JWT_SECRET = process.env.JWT_SECRET || 'x'.repeat(40);
process.env.MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:1/test';
process.env.NODE_ENV = 'test';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { recommendationFor } = require('../../src/services/prediction');

test('pontuação alta recomenda colher agora', () => {
  assert.equal(recommendationFor(90).recommendation, 'colher_agora');
});

test('pontuação intermediária recomenda monitorar', () => {
  assert.equal(recommendationFor(60).recommendation, 'monitorar');
});

test('pontuação baixa recomenda aguardar', () => {
  assert.equal(recommendationFor(20).recommendation, 'aguardar');
});
