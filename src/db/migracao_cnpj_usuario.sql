ALTER TABLE usuario
  ADD COLUMN cnpj CHAR(14) NULL AFTER email,
  ADD KEY idx_usuario_cnpj (cnpj);
