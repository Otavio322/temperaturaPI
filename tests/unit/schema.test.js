const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const schemaSql = fs.readFileSync(path.join(__dirname, '..', '..', 'src', 'db', 'schema.sql'), 'utf8');
const configuracaoMigration = fs.readFileSync(
  path.join(__dirname, '..', '..', 'src', 'db', 'migracao_configuracao_modelo_colheita.sql'),
  'utf8'
);

test('schema inclui tabelas de mercado, previsao e auditoria', () => {
  assert.match(schemaSql, /CREATE TABLE .*log_auditoria/i);
  assert.match(schemaSql, /CREATE TABLE .*climapi_coleta/i);
  assert.match(schemaSql, /CREATE TABLE .*climapi_ponto/i);
  assert.match(schemaSql, /CREATE TABLE .*previsao_temperatura/i);
  assert.match(schemaSql, /CREATE TABLE .*previsao_colheita/i);
  assert.match(schemaSql, /CREATE TABLE configuracao_modelo_colheita/i);
});

test('schema inclui o perfil ANALISTA', () => {
  assert.match(schemaSql, /ENUM\('PRODUTOR','ANALISTA','ADMIN'\)/);
});

test('migração da configuração de modelo é aditiva e cria valores padrão', () => {
  assert.match(configuracaoMigration, /CREATE TABLE IF NOT EXISTS configuracao_modelo_colheita/i);
  assert.match(configuracaoMigration, /INSERT INTO configuracao_modelo_colheita/i);
  assert.doesNotMatch(configuracaoMigration, /DROP TABLE|DELETE FROM/i);
});
