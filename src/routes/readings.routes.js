
const router = require('express').Router();
const Device = require('../models/Device');
const Reading = require('../models/Reading');
const MarketData = require('../models/MarketData');
const Prediction = require('../models/Prediction');
const schemas = require('../validators');
const { validate, validId } = require('../middleware/validate');
const { authenticate, authorize } = require('../middleware/auth');
const { asyncHandler, HttpError } = require('../utils/httpError');
const { scopeFor } = require('../utils/access');
const { evaluate, idealOf } = require('../utils/status');


const ONLINE_WINDOW_MS = 5 * 60 * 1000;

router.use(authenticate);


router.get('/', validate(schemas.readingsQuery, 'query'), asyncHandler(async (req, res) => {
  const { device: deviceId, hours, points } = req.query;
  const device = await Device.findOne({ _id: deviceId, ...scopeFor(req.user) }).populate('fruit');
  if (!device) throw new HttpError(404, 'Dispositivo não encontrado');

  const since = new Date(Date.now() - hours * 3600 * 1000);
  const bucketMs = Math.max(1000, Math.ceil((hours * 3600 * 1000) / points));

  const readings = await Reading.aggregate([
    { $match: { device: device._id, createdAt: { $gte: since } } },
    {
      $group: {
        _id: { $subtract: [{ $toLong: '$createdAt' }, { $mod: [{ $toLong: '$createdAt' }, bucketMs] }] },
        temperature: { $avg: '$temperature' },
        humidity: { $avg: '$humidity' },
      },
    },
    { $sort: { _id: 1 } },
    { $project: { _id: 0, t: '$_id', temperature: { $round: ['$temperature', 1] }, humidity: { $round: ['$humidity', 1] } } },
  ]);

  res.json({
    device: { id: device.id, name: device.name, location: device.location },
    fruit: device.fruit ? { name: device.fruit.name, ...idealOf(device.fruit) } : null,
    readings,
  });
}));


router.delete('/:deviceId', validId('deviceId'), authorize('admin'), asyncHandler(async (req, res) => {
  const { deletedCount } = await Reading.deleteMany({ device: req.params.deviceId });
  res.json({ ok: true, deletedCount });
}));

module.exports = router;


const dashboard = require('express').Router();
dashboard.get('/', authenticate, asyncHandler(async (req, res) => {
  const devices = await Device.find({ ...scopeFor(req.user), active: true }).populate('fruit').sort({ name: 1 });

  const items = await Promise.all(devices.map(async (d) => {
    const latest = await Reading.findOne({ device: d._id }).sort({ createdAt: -1 }).select('temperature humidity createdAt').lean();
    const online = Boolean(d.lastPolledAt) && Date.now() - d.lastPolledAt.getTime() < ONLINE_WINDOW_MS;
    return {
      id: d.id,
      name: d.name,
      location: d.location || '',
      simulate: d.simulate,
      fruit: d.fruit ? { id: d.fruit.id, name: d.fruit.name, ...idealOf(d.fruit) } : null,
      latest: latest ? { temperature: latest.temperature, humidity: latest.humidity, at: latest.createdAt } : null,
      evaluation: latest ? evaluate(latest.temperature, latest.humidity, d.fruit) : { status: 'sem_leitura', issues: [] },
      online,
      lastPollError: d.lastPollError || null,
    };
  }));

  
  const fruitIds = [...new Set(devices.filter((d) => d.fruit).map((d) => String(d.fruit.id)))];
  const fruitsSummary = await Promise.all(fruitIds.map(async (fruitId) => {
    const [market, prediction] = await Promise.all([
      MarketData.findOne({ fruit: fruitId }).sort({ recordedAt: -1 }),
      Prediction.findOne({ fruit: fruitId }).sort({ generatedAt: -1 }),
    ]);
    const fruit = devices.find((d) => d.fruit && String(d.fruit.id) === fruitId).fruit;
    return { fruit: { id: fruit.id, name: fruit.name }, market, prediction };
  }));

  res.json({ devices: items, fruitsSummary, serverTime: new Date().toISOString() });
}));
module.exports.dashboard = dashboard;
