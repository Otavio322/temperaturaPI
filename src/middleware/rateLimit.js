const rateLimit = require('express-rate-limit');

const base = { standardHeaders: true, legacyHeaders: false };


exports.globalLimiter = rateLimit({
  ...base, windowMs: 15 * 60 * 1000, limit: 600,
  message: { error: 'Muitas requisições. Tente novamente em alguns minutos.' },
});


exports.authLimiter = rateLimit({
  ...base, windowMs: 15 * 60 * 1000, limit: 20,
  message: { error: 'Muitas tentativas. Aguarde 15 minutos e tente de novo.' },
});

