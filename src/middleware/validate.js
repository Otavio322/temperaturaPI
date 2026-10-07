const validar = (schema, origem = 'body') => (req, res, next) => {
  const resultado = schema.safeParse(req[origem]);
  if (!resultado.success) {
    return res.status(400).json({
      error: 'Dados inválidos',
      detalhes: resultado.error.issues.map((i) => ({ campo: i.path.join('.'), mensagem: i.message })),
    });
  }
  req[origem] = resultado.data;
  next();
};

const idValido = (parametro = 'id') => (req, res, next) =>
  /^\d+$/.test(req.params[parametro]) ? next() : res.status(400).json({ error: 'ID inválido' });

module.exports = { validar, idValido };
