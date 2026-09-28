const { HttpError } = require('../utils/httpError');

const notFound = (req, res) => res.status(404).json({ error: 'Rota não encontrada' });


const errorHandler = (err, req, res, next) => {
  if (err instanceof HttpError) return res.status(err.status).json({ error: err.message });
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'JSON inválido' });
  if (err.type === 'entity.too.large') return res.status(413).json({ error: 'Corpo da requisição grande demais' });
  if (err.code === 11000) return res.status(409).json({ error: 'Já existe um registro com esses dados', campos: Object.keys(err.keyPattern || {}) });
  if (err.name === 'ValidationError') {
    return res.status(400).json({ error: Object.values(err.errors).map((e) => e.message).join('; ') });
  }
  console.error(err);
  res.status(500).json({ error: 'Erro interno do servidor' });
};

module.exports = { notFound, errorHandler };
