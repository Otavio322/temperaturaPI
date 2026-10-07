const jwt = require('jsonwebtoken');
const env = require('../config/env');

const assinarToken = (usuario) =>
  jwt.sign({ sub: usuario.id_usuario, perfil: usuario.perfil }, env.JWT_SECRET, {
    algorithm: 'HS256',
    expiresIn: env.JWT_EXPIRES_IN,
  });

module.exports = { assinarToken };
