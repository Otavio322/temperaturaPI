const env = require('../config/env');
const Device = require('../models/Device');
const Fruit = require('../models/Fruit');
const User = require('../models/User');
const Reading = require('../models/Reading');
const schemas = require('../validators');
const { validate, validId } = require('../middleware/validate');
const { authenticate, authorize } = require('../middleware/auth');
const { asyncHandler, HttpError } = require('../utils/httpError');
const { scopeFor } = require('../utils/access');
const { pollChannel } = require('../services/poller');
const { record: audit } = require('../services/audit');

router.use(authenticate);

async function checkRefs({ fruit, clients }) {
  if (fruit && !(await Fruit.exists({ _id: fruit }))) throw new HttpError(400, 'Fruta inexistente');
  if (clients && clients.length) {
    const n = await User.countDocuments({ _id: { $in: clients }, role: 'cliente' });
    if (n !== new Set(clients).size) throw new HttpError(400, 'Todos os vínculos precisam ser usuários com perfil cliente (Produtor/Exportador)');
  }
}

router.get('/', asyncHandler(async (req, res) => {
  const query = Device.find(scopeFor(req.user)).sort({ name: 1 }).populate('fruit');
  if (req.user.role === 'cliente') query.select('-clients');
  else query.populate('clients', 'name email');
  res.json({ devices: await query });
}));

router.post('/', authorize('admin'), validate(schemas.deviceCreate), asyncHandler(async (req, res) => {
  await checkRefs(req.body);
  const { thingSpeakReadApiKey, ...data } = req.body;
  
  if (data.simulate === undefined) data.simulate = !data.thingSpeakChannelId || env.thingspeakSimulateDefault;
  const device = new Device(data);
  if (thingSpeakReadApiKey) device.setThingSpeakReadApiKey(thingSpeakReadApiKey);
  await device.save();
  await audit({ req, user: req.user, action: 'canal_criado', detail: device.name });
  res.status(201).json({ device });
}));

router.put('/:id', validId(), authorize('admin'), validate(schemas.deviceUpdate), asyncHandler(async (req, res) => {
  await checkRefs(req.body);
  const { thingSpeakReadApiKey, ...data } = req.body;
  const device = await Device.findById(req.params.id);
  if (!device) throw new HttpError(404, 'Dispositivo não encontrado');
  device.set(data);
  if (thingSpeakReadApiKey) device.setThingSpeakReadApiKey(thingSpeakReadApiKey); 
  await device.save();
  await audit({ req, user: req.user, action: 'canal_atualizado', detail: device.name });
  res.json({ device });
}));


router.patch('/:id/fruit', validId(), authorize('analista', 'admin'), validate(schemas.deviceFruit), asyncHandler(async (req, res) => {
  await checkRefs({ fruit: req.body.fruit });
  const device = await Device.findByIdAndUpdate(req.params.id, { fruit: req.body.fruit }, { new: true }).populate('fruit');
  if (!device) throw new HttpError(404, 'Dispositivo não encontrado');
  res.json({ device });
}));


router.post('/:id/poll-now', validId(), authorize('admin'), asyncHandler(async (req, res) => {
  const device = await Device.findById(req.params.id).select('+thingSpeakReadApiKeyEnc').populate('fruit');
  if (!device) throw new HttpError(404, 'Dispositivo não encontrado');
  const result = await pollChannel(device);
  res.json({ ok: true, ...result });
}));

router.delete('/:id', validId(), authorize('admin'), asyncHandler(async (req, res) => {
  const device = await Device.findByIdAndDelete(req.params.id);
  if (!device) throw new HttpError(404, 'Dispositivo não encontrado');
  await Reading.deleteMany({ device: device._id });
  await audit({ req, user: req.user, action: 'canal_excluido', detail: device.name });
  res.json({ ok: true });
}));

module.exports = router;
