CREATE TABLE IF NOT EXISTS climapi_coleta (
  id_coleta      BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  id_propriedade INT UNSIGNED    NOT NULL,
  variavel       VARCHAR(60)     NOT NULL,
  execucao       VARCHAR(40)     NOT NULL,
  coletado_em    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  resposta       JSON            NOT NULL,
  PRIMARY KEY (id_coleta),
  UNIQUE KEY uq_coleta (id_propriedade, variavel, execucao),
  CONSTRAINT fk_coleta_propriedade
    FOREIGN KEY (id_propriedade) REFERENCES propriedade (id_propriedade)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS climapi_ponto (
  id_coleta   BIGINT UNSIGNED NOT NULL,
  valido_para DATETIME        NOT NULL,
  valor       DECIMAL(14,4)   NOT NULL,
  PRIMARY KEY (id_coleta, valido_para),
  CONSTRAINT fk_ponto_coleta
    FOREIGN KEY (id_coleta) REFERENCES climapi_coleta (id_coleta)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS previsao_temperatura (
  id_previsao          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  id_sensor            INT UNSIGNED    NOT NULL,
  gerada_em            DATETIME        NOT NULL,
  valida_para          DATETIME        NOT NULL,
  horizonte_h          SMALLINT UNSIGNED NOT NULL,
  temperatura_prevista DECIMAL(5,2)    NOT NULL,
  temperatura_real     DECIMAL(5,2)    NULL,
  modelo               VARCHAR(60)     NOT NULL,
  PRIMARY KEY (id_previsao),
  UNIQUE KEY uq_previsao (id_sensor, gerada_em, horizonte_h, modelo),
  KEY idx_previsao_valida (id_sensor, valida_para),
  CONSTRAINT fk_previsao_sensor
    FOREIGN KEY (id_sensor) REFERENCES sensor (id_sensor)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
