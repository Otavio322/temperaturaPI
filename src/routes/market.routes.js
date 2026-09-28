const router = require('express').Router();
const MarketData = require('../models/MarketData');
const Fruit = require('../models/Fruit');
const schemas = require('../validators');
const { validate } = require('../middleware/validate');
const { authenticate, authorize } = require('../middleware/auth');
const { asyncHandler, HttpError } = require('../utils/httpError');
const { ingestMarketData } = require('../services/marketData');

router.use(authenticate);

router.get('/', validate(schemas.marketQuery, 'query'), asyncHandler(async (req, res) => {
  const { fruit, limit } = req.query;
  const entries = await MarketData.find({ fruit }).sort({ recordedAt: -1 }).limit(limit);
  res.json({ entries: entries.reverse() });
}));


router.post('/', authorize('analista', 'admin'), validate(schemas.marketCreate), asyncHandler(async (req, res) => {
  if (!(await Fruit.exists({ _id: req.body.fruit }))) throw new HttpError(400, 'Fruta inexistente');
  const entry = await MarketData.create({ ...req.body, source: 'externo' });
  res.status(201).json({ entry });
}));


router.post('/ingest-now', authorize('analista', 'admin'), asyncHandler(async (req, res) => {
  const created = await ingestMarketData();
  res.json({ ok: true, created: created.length });
}));

module.exports = router;
