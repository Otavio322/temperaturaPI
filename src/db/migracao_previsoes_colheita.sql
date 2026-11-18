CREATE TABLE IF NOT EXISTS previsao_colheita (
  id_previsao_colheita BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  id_fruta             INT UNSIGNED NULL,
  fruta_nome           VARCHAR(60) NOT NULL,
  id_usuario           INT UNSIGNED NULL,
  id_sensor            INT UNSIGNED NULL,
  pontuacao_clima      TINYINT UNSIGNED NOT NULL,
  pontuacao_mercado    TINYINT UNSIGNED NOT NULL,
  pontuacao_combinada  TINYINT UNSIGNED NOT NULL,
  recomendacao         ENUM('colher_agora','monitorar','aguardar') NOT NULL,
  dias_estimados       SMALLINT UNSIGNED NOT NULL,
  janela_inicio        DATETIME NOT NULL,
  janela_fim           DATETIME NOT NULL,
  justificativa        TEXT NOT NULL,
  gerada_em            DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id_previsao_colheita),
  KEY idx_previsao_colheita_fruta_data (id_fruta, gerada_em),
  CONSTRAINT fk_previsao_colheita_fruta
    FOREIGN KEY (id_fruta) REFERENCES fruta (id_fruta)
    ON DELETE SET NULL,
  CONSTRAINT fk_previsao_colheita_usuario
    FOREIGN KEY (id_usuario) REFERENCES usuario (id_usuario)
    ON DELETE SET NULL,
  CONSTRAINT fk_previsao_colheita_sensor
    FOREIGN KEY (id_sensor) REFERENCES sensor (id_sensor)
    ON DELETE SET NULL,
  CONSTRAINT ck_previsao_colheita_pontuacoes CHECK (
    pontuacao_clima <= 100
    AND pontuacao_mercado <= 100
    AND pontuacao_combinada <= 100
  )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
