const jwt = require('jsonwebtoken');
const env = require('../config/env');
const User = require('../models/User');
const { asyncHandler } = require('../utils/httpError');


const authenticate = asyncHandler(async (req, res, next) => {
  const [scheme, token] = (req.headers.authorization || '').split(' ');
  if (scheme !== 'Bearer' || !token) return res.status(401).json({ error: 'Autenticação necessária' });

  let payload;
  try {
    payload = jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS256'] });
  } catch {
    return res.status(401).json({ error: 'Sessão inválida ou expirada' });
  }

  const user = await User.findById(payload.sub);
  if (!user || !user.active || user.tokenVersion !== payload.tv) {
    return res.status(401).json({ error: 'Sessão inválida ou expirada' });
  }
  req.user = user;
  next();
});


const authorize = (...roles) => (req, res, next) =>
  roles.includes(req.user.role) ? next() : res.status(403).json({ error: 'Você não tem permissão para isso' });

module.exports = { authenticate, authorize };
