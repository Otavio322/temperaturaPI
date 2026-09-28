const router = require('express').Router();
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Device = require('../models/Device');
const schemas = require('../validators');
const { validate } = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const { asyncHandler, HttpError } = require('../utils/httpError');
const { record: audit } = require('../services/audit');

router.use(authenticate);


router.get('/me/data', asyncHandler(async (req, res) => {
  const devices = req.user.role === 'cliente'
    ? await Device.find({ clients: req.user._id }).select('name location fruit')
    : [];
  res.json({
    exportedAt: new Date().toISOString(),
    user: req.user,
    linkedDevices: devices,
  });
}));


router.delete('/me', validate(schemas.accountDelete), asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('+passwordHash');
  if (!(await bcrypt.compare(req.body.password, user.passwordHash))) throw new HttpError(400, 'Senha incorreta');
  await Device.updateMany({ clients: user._id }, { $pull: { clients: user._id } });
  await user.deleteOne();
  await audit({ req, user, action: 'conta_excluida_pelo_titular' });
  res.json({ ok: true });
}));

module.exports = router;
