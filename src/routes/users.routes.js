const router = require('express').Router();
const User = require('../models/User');
const Device = require('../models/Device');
const schemas = require('../validators');
const { validate, validId } = require('../middleware/validate');
const { authenticate, authorize } = require('../middleware/auth');
const { asyncHandler, HttpError } = require('../utils/httpError');
const { signToken } = require('../utils/token');
const { record: audit } = require('../services/audit');

router.use(authenticate, authorize('admin'));

router.get('/', asyncHandler(async (req, res) => {
  const filter = req.query.role ? { role: String(req.query.role) } : {};
  res.json({ users: await User.find(filter).sort({ name: 1 }) });
}));

router.post('/', validate(schemas.createUser), asyncHandler(async (req, res) => {
  const { password, ...data } = req.body;
  const user = new User(data);
  await user.setPassword(password);
  await user.save();
  await audit({ req, user: req.user, action: 'usuario_criado_por_admin', detail: `${user.email} (${user.role})` });
  res.status(201).json({ user });
}));

router.put('/:id', validId(), validate(schemas.updateUser), asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).select('+passwordHash');
  if (!user) throw new HttpError(404, 'Usuário não encontrado');

  const { password, unlock, ...changes } = req.body;
  const isSelf = user.id === req.user.id;
  if (isSelf && ((changes.role && changes.role !== 'admin') || changes.active === false)) {
    throw new HttpError(400, 'Você não pode rebaixar nem desativar a sua própria conta');
  }

  const sensitive = Boolean(password) || (changes.role && changes.role !== user.role) || changes.active === false;
  user.set(changes);
  if (password) await user.setPassword(password);
  if (unlock) { user.failedLogins = 0; user.lockUntil = undefined; }
  if (sensitive) user.tokenVersion += 1; 
  await user.save();
  await audit({ req, user: req.user, action: 'usuario_atualizado_por_admin', detail: `${user.email}` });

  
  res.json({ user, ...(isSelf && sensitive ? { token: signToken(user) } : {}) });
}));

router.delete('/:id', validId(), asyncHandler(async (req, res) => {
  if (req.params.id === req.user.id) throw new HttpError(400, 'Você não pode excluir a sua própria conta');
  const user = await User.findByIdAndDelete(req.params.id);
  if (!user) throw new HttpError(404, 'Usuário não encontrado');
  await Device.updateMany({ clients: user._id }, { $pull: { clients: user._id } });
  await audit({ req, user: req.user, action: 'usuario_excluido_por_admin', detail: user.email });
  res.json({ ok: true });
}));

module.exports = router;
