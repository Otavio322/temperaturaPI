const router = require('express').Router();
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const schemas = require('../validators');
const { validate } = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimit');
const { asyncHandler, HttpError } = require('../utils/httpError');
const { signToken } = require('../utils/token');
const { record: audit } = require('../services/audit');
const env = require('../config/env');

const MAX_FAILS = 5;
const LOCK_MINUTES = 15;
const DUMMY_HASH = bcrypt.hashSync('senha-falsa-Xx123456', 12);


router.post('/register', authLimiter, validate(schemas.register), asyncHandler(async (req, res) => {
  if (!env.allowPublicRegister) throw new HttpError(403, 'Cadastro público desativado. Peça a um administrador.');
  const { name, email, password } = req.body;
  const user = new User({ name, email, role: 'cliente' });
  await user.setPassword(password);
  await user.save();
  await audit({ req, user, action: 'usuario_registrado' });
  res.status(201).json({ token: signToken(user), user });
}));

router.post('/login', authLimiter, validate(schemas.login), asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email }).select('+passwordHash');

  if (user && user.lockUntil && user.lockUntil > new Date()) {
    throw new HttpError(423, 'Conta bloqueada temporariamente por excesso de tentativas. Tente mais tarde.');
  }

  const passwordOk = await bcrypt.compare(password, user ? user.passwordHash : DUMMY_HASH);
  if (!user || !passwordOk || !user.active) {
    if (user && !passwordOk) {
      user.failedLogins += 1;
      if (user.failedLogins >= MAX_FAILS) {
        user.lockUntil = new Date(Date.now() + LOCK_MINUTES * 60 * 1000);
        user.failedLogins = 0;
        await audit({ req, user, action: 'conta_bloqueada', success: false, detail: 'excesso de tentativas de login' });
      }
      await user.save();
    }
    await audit({ req, user, action: 'login_falha', success: false });
    throw new HttpError(401, 'E-mail ou senha incorretos');
  }

  if (user.failedLogins || user.lockUntil) {
    user.failedLogins = 0;
    user.lockUntil = undefined;
    await user.save();
  }
  await audit({ req, user, action: 'login_sucesso' });
  res.json({ token: signToken(user), user });
}));

router.get('/me', authenticate, (req, res) => res.json({ user: req.user }));


router.post('/logout', authenticate, asyncHandler(async (req, res) => {
  await User.updateOne({ _id: req.user._id }, { $inc: { tokenVersion: 1 } });
  res.json({ ok: true });
}));

router.post('/change-password', authenticate, validate(schemas.changePassword), asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('+passwordHash');
  if (!(await user.checkPassword(req.body.currentPassword))) throw new HttpError(400, 'Senha atual incorreta');
  await user.setPassword(req.body.newPassword);
  user.tokenVersion += 1; // derruba outras sessões
  await user.save();
  res.json({ token: signToken(user), user });
}));

module.exports = router;
