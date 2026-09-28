const Reading = require('../models/Reading');
const MarketData = require('../models/MarketData');
const Prediction = require('../models/Prediction');
const Fruit = require('../models/Fruit');
const { evaluate } = require('../utils/status');

const CLIMATE_WEIGHT = 0.7;
const MARKET_WEIGHT = 0.3;
const WINDOW_HOURS = 72;

async function climateScoreFor(fruit, deviceId) {
  const since = new Date(Date.now() - WINDOW_HOURS * 3600 * 1000);
  const filter = { createdAt: { $gte: since } };
  if (deviceId) filter.device = deviceId;
  const readings = await Reading.find(filter).select('temperature humidity').lean();
  if (!readings.length) return { score: 0, sampleSize: 0 };
  const inIdeal = readings.filter((r) => evaluate(r.temperature, r.humidity, fruit).status === 'ok').length;
  return { score: Math.round((inIdeal / readings.length) * 100), sampleSize: readings.length };
}

async function marketScoreFor(fruitId) {
  const points = await MarketData.find({ fruit: fruitId }).sort({ recordedAt: -1 }).limit(6).lean();
  if (points.length < 2) return { score: 50, trend: 'sem_dados_suficientes' }; 
  const [latest, ...rest] = points;
  const avgPrevious = rest.reduce((s, p) => s + p.price, 0) / rest.length;
  const priceChangePct = avgPrevious ? ((latest.price - avgPrevious) / avgPrevious) * 100 : 0;
  const trend = priceChangePct > 2 ? 'subindo' : priceChangePct < -2 ? 'caindo' : 'estavel';
  
  const score = Math.min(100, Math.max(0, 50 + priceChangePct * 3 + (latest.demandIndex - 50) * 0.4));
  return { score: Math.round(score), trend, latestPrice: latest.price, demandIndex: latest.demandIndex };
}

function recommendationFor(combined) {
  if (combined >= 75) return { recommendation: 'colher_agora', days: 3 };
  if (combined >= 45) return { recommendation: 'monitorar', days: 7 };
  return { recommendation: 'aguardar', days: 14 };
}

async function generatePrediction({ fruitId, deviceId, userId }) {
  const fruit = await Fruit.findById(fruitId);
  if (!fruit) throw new Error('Fruta não encontrada');

  const climate = await climateScoreFor(fruit, deviceId);
  const market = await marketScoreFor(fruitId);
  const combinedScore = Math.round(climate.score * CLIMATE_WEIGHT + market.score * MARKET_WEIGHT);
  const { recommendation, days } = recommendationFor(combinedScore);

  const windowStart = new Date();
  const windowEnd = new Date(Date.now() + days * 86400 * 1000);
  const rationale =
    `Clima dentro do ideal em ${climate.score}% das ${climate.sampleSize} leituras das últimas ${WINDOW_HOURS}h; ` +
    `mercado ${market.trend} (demanda ${market.demandIndex ?? '—'}/100).`;

  return Prediction.create({
    fruit: fruit._id,
    device: deviceId || null,
    climateScore: climate.score,
    marketScore: market.score,
    combinedScore,
    recommendation,
    windowStart,
    windowEnd,
    rationale,
    generatedBy: userId || null,
  });
}

module.exports = { generatePrediction, climateScoreFor, marketScoreFor, recommendationFor };
