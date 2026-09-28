
process.env.ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'a'.repeat(64);
process.env.JWT_SECRET = process.env.JWT_SECRET || 'x'.repeat(40);
process.env.MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:1/test';
process.env.NODE_ENV = 'test';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { encrypt, decrypt, maskTail } = require('../../src/config/crypto');

test('criptografa e descriptografa corretamente', () => {
  const original = 'MINHA_READ_API_KEY_123456';
  const enc = encrypt(original);
  assert.notEqual(enc, original);
  assert.equal(decrypt(enc), original);
});

test('duas criptografias do mesmo valor não são iguais (IV aleatório)', () => {
  const a = encrypt('mesmo-valor');
  const b = encrypt('mesmo-valor');
  assert.notEqual(a, b);
});

test('maskTail nunca revela a chave inteira', () => {
  const masked = maskTail('ABCDEFGH1234');
  assert.equal(masked, '••••1234');
});

test('valor vazio não é criptografado', () => {
  assert.equal(encrypt(''), null);
  assert.equal(encrypt(null), null);
});
