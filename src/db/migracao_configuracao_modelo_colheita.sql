CREATE TABLE IF NOT EXISTS configuracao_modelo_colheita (
  id_modelo        TINYINT UNSIGNED NOT NULL,
  peso_clima       DECIMAL(4,3) NOT NULL DEFAULT 0.700,
  limiar_colher    TINYINT UNSIGNED NOT NULL DEFAULT 75,
  limiar_monitorar TINYINT UNSIGNED NOT NULL DEFAULT 45,
  atualizado_por   INT UNSIGNED NULL,
  atualizado_em    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id_modelo),
  CONSTRAINT ck_modelo_colheita_unico CHECK (id_modelo = 1),
  CONSTRAINT ck_modelo_peso_clima CHECK (peso_clima >= 0 AND peso_clima <= 1),
  CONSTRAINT ck_modelo_limites CHECK (
    limiar_colher <= 100
    AND limiar_monitorar < limiar_colher
  ),
  CONSTRAINT fk_modelo_atualizado_por
    FOREIGN KEY (atualizado_por) REFERENCES usuario (id_usuario)
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO configuracao_modelo_colheita (id_modelo, peso_clima, limiar_colher, limiar_monitorar)
VALUES (1, 0.700, 75, 45)
ON DUPLICATE KEY UPDATE id_modelo = VALUES(id_modelo);
