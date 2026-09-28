const validate = (schema, source = 'body') => (req, res, next) => {
  const result = schema.safeParse(req[source]);
  if (!result.success) {
    return res.status(400).json({
      error: 'Dados inválidos',
      detalhes: result.error.issues.map((i) => ({ campo: i.path.join('.'), mensagem: i.message })),
    });
  }
  req[source] = result.data;
  next();
};

const validId = (param = 'id') => (req, res, next) =>
  /^[a-f\d]{24}$/i.test(req.params[param]) ? next() : res.status(400).json({ error: 'ID inválido' });

module.exports = { validate, validId };
