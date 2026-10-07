-- =====================================================================
-- CLIMORA - Modelo de dados enxuto (MySQL 8.0+)
-- Monitoramento de temperatura e umidade - Vale do Sao Francisco
-- =====================================================================
-- Ordem: 1) criar banco  2) criar tabelas  3) dados de exemplo  4) consultas
-- =====================================================================

DROP DATABASE IF EXISTS climora;
CREATE DATABASE climora
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
USE climora;

-- ---------------------------------------------------------------------
-- 1. USUARIO
-- Quem acessa o sistema. O perfil virou um ENUM (sem tabela Perfil/Permissao).
-- ---------------------------------------------------------------------
CREATE TABLE usuario (
  id_usuario      INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  nome            VARCHAR(100)  NOT NULL,
  email           VARCHAR(150)  NOT NULL,
  senha_hash      VARCHAR(255)  NOT NULL,            -- nunca guardar senha pura
  perfil          ENUM('PRODUTOR','ADMIN') NOT NULL DEFAULT 'PRODUTOR',
  ativo           BOOLEAN       NOT NULL DEFAULT TRUE,
  ultimo_login_em DATETIME      NULL,
  criado_em       DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id_usuario),
  UNIQUE KEY uq_usuario_email (email)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 2. PROPRIEDADE
-- Fazenda / propriedade agricola. (area_ha foi removida: e a soma dos setores)
-- ---------------------------------------------------------------------
CREATE TABLE propriedade (
  id_propriedade INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  nome           VARCHAR(100)  NOT NULL,
  municipio      VARCHAR(100)  NOT NULL,
  uf             CHAR(2)       NOT NULL,
  latitude       DECIMAL(9,6)  NULL,
  longitude      DECIMAL(9,6)  NULL,
  PRIMARY KEY (id_propriedade)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 3. USUARIO_PROPRIEDADE  (relacao N:N)
-- Um usuario pode acompanhar varias propriedades e uma propriedade
-- pode ter varios usuarios (dono, gerente, tecnico...).
-- Se o grupo preferir 1:N, apague esta tabela e coloque id_usuario
-- como FK dentro de propriedade.
-- ---------------------------------------------------------------------
CREATE TABLE usuario_propriedade (
  id_usuario     INT UNSIGNED NOT NULL,
  id_propriedade INT UNSIGNED NOT NULL,
  PRIMARY KEY (id_usuario, id_propriedade),
  CONSTRAINT fk_up_usuario
    FOREIGN KEY (id_usuario)     REFERENCES usuario (id_usuario)
    ON DELETE CASCADE,
  CONSTRAINT fk_up_propriedade
    FOREIGN KEY (id_propriedade) REFERENCES propriedade (id_propriedade)
    ON DELETE CASCADE
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 4. FRUTA (cultura)
-- Guarda tambem a faixa ideal de temperatura e umidade, que e usada
-- para gerar os alertas.
-- ---------------------------------------------------------------------
CREATE TABLE fruta (
  id_fruta     INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  nome         VARCHAR(60)   NOT NULL,
  temp_min     DECIMAL(5,2)  NOT NULL,
  temp_max     DECIMAL(5,2)  NOT NULL,
  umidade_min  DECIMAL(5,2)  NOT NULL,
  umidade_max  DECIMAL(5,2)  NOT NULL,
  PRIMARY KEY (id_fruta),
  UNIQUE KEY uq_fruta_nome (nome),
  CONSTRAINT ck_fruta_temp    CHECK (temp_min < temp_max),
  CONSTRAINT ck_fruta_umidade CHECK (umidade_min < umidade_max
                                     AND umidade_min >= 0 AND umidade_max <= 100)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 5. SETOR
-- Area da propriedade plantada com uma fruta (talhao).
-- ---------------------------------------------------------------------
CREATE TABLE setor (
  id_setor       INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  id_propriedade INT UNSIGNED  NOT NULL,
  id_fruta       INT UNSIGNED  NOT NULL,
  codigo         VARCHAR(20)   NOT NULL,             -- ex.: 'A1', 'B2'
  area_ha        DECIMAL(10,2) NOT NULL,
  PRIMARY KEY (id_setor),
  UNIQUE KEY uq_setor_codigo (id_propriedade, codigo),
  CONSTRAINT fk_setor_propriedade
    FOREIGN KEY (id_propriedade) REFERENCES propriedade (id_propriedade)
    ON DELETE CASCADE,
  CONSTRAINT fk_setor_fruta
    FOREIGN KEY (id_fruta)       REFERENCES fruta (id_fruta),
  CONSTRAINT ck_setor_area CHECK (area_ha > 0)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 6. SENSOR
-- Dispositivo instalado em um setor (futuro: integracao via ThingSpeak).
-- Mantido apenas UM campo de status (antes havia status e status_conexao).
-- ---------------------------------------------------------------------
CREATE TABLE sensor (
  id_sensor             INT UNSIGNED NOT NULL AUTO_INCREMENT,
  id_setor              INT UNSIGNED NOT NULL,
  codigo                VARCHAR(30)  NOT NULL,
  thingspeak_channel_id VARCHAR(30)  NULL,
  status                ENUM('ATIVO','INATIVO','MANUTENCAO') NOT NULL DEFAULT 'ATIVO',
  ultima_leitura_em     DATETIME     NULL,
  PRIMARY KEY (id_sensor),
  UNIQUE KEY uq_sensor_codigo (codigo),
  CONSTRAINT fk_sensor_setor
    FOREIGN KEY (id_setor) REFERENCES setor (id_setor)
    ON DELETE CASCADE
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 7. LEITURA_CLIMATICA
-- Cada medicao de temperatura e umidade feita por um sensor.
-- Chave propria (id_leitura) + unicidade sensor/horario, para dois
-- sensores poderem medir no mesmo instante.
-- ---------------------------------------------------------------------
CREATE TABLE leitura_climatica (
  id_leitura  BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  id_sensor   INT UNSIGNED    NOT NULL,
  medido_em   DATETIME        NOT NULL,
  temperatura DECIMAL(5,2)    NOT NULL,              -- graus Celsius
  umidade     DECIMAL(5,2)    NOT NULL,              -- percentual (0 a 100)
  valida      BOOLEAN         NOT NULL DEFAULT TRUE, -- FALSE = leitura descartada
  PRIMARY KEY (id_leitura),
  UNIQUE KEY uq_leitura_sensor_hora (id_sensor, medido_em),
  CONSTRAINT fk_leitura_sensor
    FOREIGN KEY (id_sensor) REFERENCES sensor (id_sensor)
    ON DELETE CASCADE,
  CONSTRAINT ck_leitura_umidade CHECK (umidade BETWEEN 0 AND 100)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 8. ALERTA
-- Gerado quando uma leitura sai da faixa da fruta, ou quando o sensor
-- para de enviar dados (nesse caso id_leitura fica NULL).
-- ---------------------------------------------------------------------
CREATE TABLE alerta (
  id_alerta  INT UNSIGNED NOT NULL AUTO_INCREMENT,
  id_sensor  INT UNSIGNED NOT NULL,
  id_leitura BIGINT UNSIGNED NULL,
  tipo       ENUM('TEMPERATURA_ALTA','TEMPERATURA_BAIXA',
                  'UMIDADE_ALTA','UMIDADE_BAIXA','SENSOR_OFFLINE') NOT NULL,
  severidade ENUM('BAIXA','MEDIA','ALTA') NOT NULL DEFAULT 'MEDIA',
  mensagem   VARCHAR(255) NOT NULL,
  lido       BOOLEAN      NOT NULL DEFAULT FALSE,
  criado_em  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id_alerta),
  CONSTRAINT fk_alerta_sensor
    FOREIGN KEY (id_sensor)  REFERENCES sensor (id_sensor)
    ON DELETE CASCADE,
  CONSTRAINT fk_alerta_leitura
    FOREIGN KEY (id_leitura) REFERENCES leitura_climatica (id_leitura)
    ON DELETE SET NULL
) ENGINE=InnoDB;

-- Indices para as consultas mais comuns (historico por sensor / alertas nao lidos)
CREATE INDEX idx_leitura_hora ON leitura_climatica (medido_em);
CREATE INDEX idx_alerta_lido  ON alerta (lido, criado_em);

-- =====================================================================
-- DADOS DE EXEMPLO (para testar)
-- =====================================================================
INSERT INTO usuario (nome, email, senha_hash, perfil) VALUES
  ('Maria Produtora', 'maria@exemplo.com', 'hash_exemplo_1', 'PRODUTOR'),
  ('Admin Climora',   'admin@exemplo.com', 'hash_exemplo_2', 'ADMIN');

INSERT INTO propriedade (nome, municipio, uf, latitude, longitude) VALUES
  ('Fazenda Boa Safra', 'Petrolina', 'PE', -9.398500, -40.500800);

INSERT INTO usuario_propriedade (id_usuario, id_propriedade) VALUES (1, 1), (2, 1);

INSERT INTO fruta (nome, temp_min, temp_max, umidade_min, umidade_max) VALUES
  ('Manga', 20.00, 35.00, 50.00, 80.00),
  ('Uva',   15.00, 32.00, 55.00, 75.00);

INSERT INTO setor (id_propriedade, id_fruta, codigo, area_ha) VALUES
  (1, 1, 'A1', 12.50),
  (1, 2, 'B1',  8.00);

INSERT INTO sensor (id_setor, codigo, thingspeak_channel_id, status) VALUES
  (1, 'SENS-A1-01', '1234567', 'ATIVO'),
  (2, 'SENS-B1-01', '7654321', 'ATIVO');

INSERT INTO leitura_climatica (id_sensor, medido_em, temperatura, umidade) VALUES
  (1, '2026-10-01 08:00:00', 29.50, 62.00),
  (1, '2026-10-01 09:00:00', 31.20, 58.50),
  (1, '2026-10-01 10:00:00', 36.40, 45.00),   -- fora da faixa da manga
  (2, '2026-10-01 08:00:00', 27.80, 66.00),
  (2, '2026-10-01 09:00:00', 29.10, 63.50);

INSERT INTO alerta (id_sensor, id_leitura, tipo, severidade, mensagem) VALUES
  (1, 3, 'TEMPERATURA_ALTA', 'ALTA', 'Temperatura acima da faixa ideal para manga (36.4 C).'),
  (1, 3, 'UMIDADE_BAIXA',    'MEDIA', 'Umidade abaixo da faixa ideal para manga (45%).');

-- =====================================================================
-- CONSULTAS UTEIS (cobrem o que a pesquisa de mercado descreve)
-- =====================================================================

-- A) Temperatura e umidade ATUAIS de cada setor (ultima leitura valida)
SELECT s.codigo AS setor, f.nome AS fruta,
       l.temperatura, l.umidade, l.medido_em
FROM leitura_climatica l
JOIN sensor se ON se.id_sensor = l.id_sensor
JOIN setor  s  ON s.id_setor   = se.id_setor
JOIN fruta  f  ON f.id_fruta   = s.id_fruta
WHERE l.valida = TRUE
  AND l.medido_em = (SELECT MAX(l2.medido_em)
                     FROM leitura_climatica l2
                     WHERE l2.id_sensor = l.id_sensor AND l2.valida = TRUE);

-- B) Historico de medicoes de um setor (ex.: setor 1)
SELECT l.medido_em, l.temperatura, l.umidade
FROM leitura_climatica l
JOIN sensor se ON se.id_sensor = l.id_sensor
WHERE se.id_setor = 1 AND l.valida = TRUE
ORDER BY l.medido_em DESC;

-- C) Leituras FORA da faixa ideal da fruta (base para gerar alertas)
SELECT s.codigo AS setor, f.nome AS fruta, l.medido_em, l.temperatura, l.umidade
FROM leitura_climatica l
JOIN sensor se ON se.id_sensor = l.id_sensor
JOIN setor  s  ON s.id_setor   = se.id_setor
JOIN fruta  f  ON f.id_fruta   = s.id_fruta
WHERE l.valida = TRUE
  AND (l.temperatura NOT BETWEEN f.temp_min AND f.temp_max
    OR l.umidade     NOT BETWEEN f.umidade_min AND f.umidade_max);

-- D) Alertas nao lidos de um usuario
SELECT a.criado_em, a.severidade, a.tipo, a.mensagem
FROM alerta a
JOIN sensor se ON se.id_sensor = a.id_sensor
JOIN setor  s  ON s.id_setor   = se.id_setor
JOIN usuario_propriedade up ON up.id_propriedade = s.id_propriedade
WHERE up.id_usuario = 1 AND a.lido = FALSE
ORDER BY a.criado_em DESC;
