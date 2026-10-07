// Validação de entrada (zod) espelhando as restrições do schema SQL.
process.env.JWT_SECRET = process.env.JWT_SECRET || 'x'.repeat(40);
process.env.DB_USER = process.env.DB_USER || 'climora';
process.env.NODE_ENV = 'test';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const schemas = require('../../src/validators');

test('registrar rejeita campo extra (perfil) — não dá pra se autopromover a admin', () => {
  const r = schemas.registrar.safeParse({ nome: 'Ana', email: 'a@x.com', senha: 'SenhaForte123', perfil: 'ADMIN' });
  assert.equal(r.success, false);
});

test('registrar rejeita senha fraca', () => {
  assert.equal(schemas.registrar.safeParse({ nome: 'Ana', email: 'a@x.com', senha: 'abc' }).success, false);
});

test('registrar aceita payload válido', () => {
  assert.equal(schemas.registrar.safeParse({ nome: 'Ana', email: 'a@x.com', senha: 'SenhaForte123' }).success, true);
});

test('criarFruta rejeita temp_min >= temp_max', () => {
  const r = schemas.criarFruta.safeParse({ nome: 'Manga', tempMin: 30, tempMax: 20, umidadeMin: 10, umidadeMax: 90 });
  assert.equal(r.success, false);
});

test('criarFruta rejeita umidade fora de 0-100', () => {
  const r = schemas.criarFruta.safeParse({ nome: 'Manga', tempMin: 10, tempMax: 30, umidadeMin: -5, umidadeMax: 90 });
  assert.equal(r.success, false);
});

test('criarFruta aceita payload válido', () => {
  const r = schemas.criarFruta.safeParse({ nome: 'Manga', tempMin: 20, tempMax: 35, umidadeMin: 50, umidadeMax: 80 });
  assert.equal(r.success, true);
});

test('criarSetor exige idPropriedade, idFruta, codigo e areaHa positiva', () => {
  assert.equal(schemas.criarSetor.safeParse({ idPropriedade: 1, idFruta: 1, codigo: 'A1', areaHa: 0 }).success, false);
  assert.equal(schemas.criarSetor.safeParse({ idPropriedade: 1, idFruta: 1, codigo: 'A1', areaHa: 5 }).success, true);
});

test('criarSensor aceita sem thingspeakChannelId (vai simular)', () => {
  assert.equal(schemas.criarSensor.safeParse({ idSetor: 1, codigo: 'S1' }).success, true);
});

test('criarSensor rejeita status fora do ENUM', () => {
  assert.equal(schemas.criarSensor.safeParse({ idSetor: 1, codigo: 'S1', status: 'QUEBRADO' }).success, false);
});

test('propriedadeBase exige UF com 2 letras', () => {
  assert.equal(schemas.propriedadeBase.safeParse({ nome: 'Fazenda X', municipio: 'Petrolina', uf: 'PERNAMBUCO' }).success, false);
  assert.equal(schemas.propriedadeBase.safeParse({ nome: 'Fazenda X', municipio: 'Petrolina', uf: 'pe' }).success, true);
});
