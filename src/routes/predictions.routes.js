// Previsão da janela ideal de colheita/exportação — RF06.
const router = require('express').Router();
const Prediction = require('../models/Prediction');
const schemas = require('../validators');
const { validate } = require('../middleware/validate');
const { authenticate, authorize } = require('../middleware/auth');
const { asyncHandler } = require('../utils/httpError');
const { generatePrediction } = require('../services/prediction');

router.use(authenticate);

router.get('/', validate(schemas.predictionQuery, 'query'), asyncHandler(async (req, res) => {
  const { fruit, limit } = req.query;
  const predictions = await Prediction.find({ fruit }).sort({ generatedAt: -1 }).limit(limit);
  res.json({ predictions });
}));

router.post('/', authorize('analista', 'admin'), validate(schemas.predictionGenerate), asyncHandler(async (req, res) => {
  const prediction = await generatePrediction({ fruitId: req.body.fruit, deviceId: req.body.device, userId: req.user._id });
  res.status(201).json({ prediction });
}));

module.exports = router;
