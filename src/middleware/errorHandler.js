const { ErroHttp } = require('../utils/httpError');

const naoEncontrado = (req, res) => res.status(404).json({ error: 'Rota não encontrada' });

const tratadorDeErros = (err, req, res, next) => {
  if (err instanceof ErroHttp) return res.status(err.status).json({ error: err.message });
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'JSON inválido' });
  if (err.type === 'entity.too.large') return res.status(413).json({ error: 'Corpo da requisição grande demais' });

  if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Já existe um registro com esses dados' });
  if (err.code === 'ER_NO_REFERENCED_ROW_2' || err.code === 'ER_NO_REFERENCED_ROW') return res.status(400).json({ error: 'Referência inválida (ID relacionado não existe)' });
  if (err.code === 'ER_ROW_IS_REFERENCED_2' || err.code === 'ER_ROW_IS_REFERENCED') return res.status(409).json({ error: 'Não é possível excluir: existem registros que dependem deste' });

  if (err.errno === 4025 || err.errno === 3819 || /constraint/i.test(err.sqlMessage || '')) {
    return res.status(400).json({ error: 'Valor viola uma restrição do banco (ex.: faixa mínima maior que a máxima)' });
  }
  console.error(err);
  res.status(500).json({ error: 'Erro interno do servidor' });
};

module.exports = { naoEncontrado, tratadorDeErros };
