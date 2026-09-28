const router = require('express').Router();
const Fruit = require('../models/Fruit');
const Device = require('../models/Device');
const schemas = require('../validators');
const { validate, validId } = require('../middleware/validate');
const { authenticate, authorize } = require('../middleware/auth');
const { asyncHandler, HttpError } = require('../utils/httpError');

router.use(authenticate);
const canEdit = authorize('analista', 'admin');

router.get('/', asyncHandler(async (req, res) => {
  res.json({ fruits: await Fruit.find().sort({ name: 1 }).populate('updatedBy', 'name') });
}));

router.post('/', canEdit, validate(schemas.fruitCreate), asyncHandler(async (req, res) => {
  const fruit = await Fruit.create({ ...req.body, updatedBy: req.user._id });
  res.status(201).json({ fruit });
}));

router.put('/:id', validId(), canEdit, validate(schemas.fruitUpdate), asyncHandler(async (req, res) => {
  const fruit = await Fruit.findById(req.params.id);
  if (!fruit) throw new HttpError(404, 'Fruta não encontrada');
  fruit.set({ ...req.body, updatedBy: req.user._id });
  await fruit.save(); 
  res.json({ fruit });
}));

router.delete('/:id', validId(), canEdit, asyncHandler(async (req, res) => {
  if (await Device.exists({ fruit: req.params.id })) {
    throw new HttpError(409, 'Esta fruta está em uso por um dispositivo. Troque a fruta do dispositivo antes de excluir.');
  }
  const fruit = await Fruit.findByIdAndDelete(req.params.id);
  if (!fruit) throw new HttpError(404, 'Fruta não encontrada');
  res.json({ ok: true });
}));

module.exports = router;
