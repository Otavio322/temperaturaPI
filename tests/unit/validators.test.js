
process.env.ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'a'.repeat(64);
process.env.JWT_SECRET = process.env.JWT_SECRET || 'x'.repeat(40);
process.env.MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:1/test';
process.env.NODE_ENV = 'test';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const schemas = require('../../src/validators');

test('register rejeita campos extras como role', () => {
  const r = schemas.register.safeParse({ name: 'Ana', email: 'a@x.com', password: 'SenhaForte123', role: 'admin' });
  assert.equal(r.success, false);
});

test('register rejeita senha fraca', () => {
  const r = schemas.register.safeParse({ name: 'Ana', email: 'a@x.com', password: 'abc' });
  assert.equal(r.success, false);
});

test('register aceita payload válido', () => {
  const r = schemas.register.safeParse({ name: 'Ana', email: 'a@x.com', password: 'SenhaForte123' });
  assert.equal(r.success, true);
});

test('deviceCreate aceita canal simulado sem thingSpeakChannelId', () => {
  const r = schemas.deviceCreate.safeParse({ name: 'Câmara 1', simulate: true });
  assert.equal(r.success, true);
});

test('fruitCreate rejeita mínimo maior que máximo', () => {
  const r = schemas.fruitCreate.safeParse({ name: 'Manga', tempMin: 20, tempMax: 10, humMin: 80, humMax: 90 });
  assert.equal(r.success, false);
});
