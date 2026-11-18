const { pool } = require('../config/db');

async function registrar({ idUsuario = null, acao, sucesso = true, detalhe = null, ip = null }) {
  const [resultado] = await pool.execute(
    'INSERT INTO log_auditoria (id_usuario, acao, sucesso, detalhe, ip_origem) VALUES (:idUsuario, :acao, :sucesso, :detalhe, :ip)',
    {
      idUsuario,
      acao,
      sucesso: Boolean(sucesso),
      detalhe: detalhe || null,
      ip: ip || null,
    }
  );

  const [linhas] = await pool.execute(
    `SELECT la.*, u.nome AS usuario_nome
     FROM log_auditoria la
     LEFT JOIN usuario u ON u.id_usuario = la.id_usuario
     WHERE la.id_log_auditoria = :idLog`,
    { idLog: resultado.insertId }
  );
  return linhas[0] || null;
}

async function listarResumo({ dias = 30, limite = 20 } = {}) {
  const [linhas] = await pool.execute(
    `SELECT acao, sucesso, COUNT(*) AS total
     FROM log_auditoria
     WHERE criado_em >= DATE_SUB(NOW(), INTERVAL :dias DAY)
     GROUP BY acao, sucesso
     ORDER BY total DESC, acao ASC
     LIMIT :limite`,
    { dias, limite }
  );
  return linhas;
}

async function listarFalhasRecentes({ dias = 30, limite = 50 } = {}) {
  const [linhas] = await pool.execute(
    `SELECT la.*, u.nome AS usuario_nome
     FROM log_auditoria la
     LEFT JOIN usuario u ON u.id_usuario = la.id_usuario
     WHERE la.sucesso = FALSE
       AND la.criado_em >= DATE_SUB(NOW(), INTERVAL :dias DAY)
     ORDER BY la.criado_em DESC
     LIMIT :limite`,
    { dias, limite }
  );
  return linhas;
}

module.exports = { registrar, listarResumo, listarFalhasRecentes };
