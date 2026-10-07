const jwt = require('jsonwebtoken');
const env = require('../config/env');
const usuarios = require('../repositorios/usuarios');
const { assincrono } = require('../utils/httpError');

const autenticar = assincrono(async (req, res, next) => {
  const [esquema, token] = (req.headers.authorization || '').split(' ');
  if (esquema !== 'Bearer' || !token) return res.status(401).json({ error: 'Autenticação necessária' });

  let payload;
  try {
    payload = jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS256'] });
  } catch {
    return res.status(401).json({ error: 'Sessão inválida ou expirada' });
  }

  const usuario = await usuarios.buscarPorId(payload.sub);
  if (!usuario || !usuario.ativo) return res.status(401).json({ error: 'Sessão inválida ou expirada' });
  req.usuario = usuario;
  next();
});

const autorizar = (...perfis) => (req, res, next) =>
  perfis.includes(req.usuario.perfil) ? next() : res.status(403).json({ error: 'Você não tem permissão para isso' });

module.exports = { autenticar, autorizar };
