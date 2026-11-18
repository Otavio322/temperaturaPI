const { evaluate } = require('../utils/status');

const CLIMATE_WEIGHT = 0.7;
const WINDOW_HOURS = 72;

function recommendationFor(combined, config = {}) {
  const harvestThreshold = config.harvestThreshold ?? 75;
  const monitorThreshold = config.monitorThreshold ?? 45;
  if (combined >= harvestThreshold) return { recommendation: 'colher_agora', days: 3 };
  if (combined >= monitorThreshold) return { recommendation: 'monitorar', days: 7 };
  return { recommendation: 'aguardar', days: 14 };
}

function normalizeReadings(readings = []) {
  if (!Array.isArray(readings)) return [];
  return readings.filter((reading) => Number.isFinite(Number(reading?.temperature)) && Number.isFinite(Number(reading?.humidity)));
}

async function climateScoreFor(fruit, readings = []) {
  const dados = normalizeReadings(readings);
  if (!dados.length) return { score: 0, sampleSize: 0 };

  const dentroDoIdeal = dados.filter((r) => evaluate(Number(r.temperature), Number(r.humidity), fruit).status === 'ok').length;
  return { score: Math.round((dentroDoIdeal / dados.length) * 100), sampleSize: dados.length };
}

function normalizeMarketPoints(points = []) {
  if (!Array.isArray(points)) return [];
  return points.filter((point) => Number.isFinite(Number(point?.price)) || Number.isFinite(Number(point?.demandIndex)));
}

async function marketScoreFor(fruitId, points = []) {
  const dados = normalizeMarketPoints(points);
  if (dados.length < 2) return { score: 50, trend: 'sem_dados_suficientes', latestPrice: null, demandIndex: null };

  const [latest, ...rest] = dados;
  const avgPrevious = rest.reduce((soma, item) => soma + Number(item.price), 0) / rest.length;
  const priceChangePct = avgPrevious ? ((Number(latest.price) - avgPrevious) / avgPrevious) * 100 : 0;
  const trend = priceChangePct > 2 ? 'subindo' : priceChangePct < -2 ? 'caindo' : 'estavel';

  const score = Math.min(100, Math.max(0, 50 + priceChangePct * 3 + (Number(latest.demandIndex ?? 50) - 50) * 0.4));
  return {
    score: Math.round(score),
    trend,
    latestPrice: Number(latest.price),
    demandIndex: Number(latest.demandIndex ?? 50),
  };
}

async function generatePrediction({
  fruitId,
  deviceId,
  userId,
  fruit = null,
  readings = [],
  marketPoints = [],
  modelConfig = {},
} = {}) {
  const fruta = fruit || { tempMin: 10, tempMax: 30, humMin: 40, humMax: 80 };
  const climate = await climateScoreFor(fruta, readings);
  const market = await marketScoreFor(fruitId, marketPoints);
  const climateWeight = modelConfig.climateWeight ?? CLIMATE_WEIGHT;
  const marketWeight = Number((1 - climateWeight).toFixed(3));
  const harvestThreshold = modelConfig.harvestThreshold ?? 75;
  const monitorThreshold = modelConfig.monitorThreshold ?? 45;
  const combinedScore = Math.round(climate.score * climateWeight + market.score * marketWeight);
  const { recommendation, days } = recommendationFor(combinedScore, { harvestThreshold, monitorThreshold });

  return {
    fruitId,
    deviceId: deviceId || null,
    climateScore: climate.score,
    marketScore: market.score,
    combinedScore,
    recommendation,
    days,
    windowStart: new Date(),
    windowEnd: new Date(Date.now() + days * 86400 * 1000),
    rationale: `Clima dentro do ideal em ${climate.score}% das ${climate.sampleSize} leituras das últimas ${WINDOW_HOURS}h; mercado ${market.trend} (demanda ${market.demandIndex ?? '—'}/100).`,
    modelConfig: { climateWeight, marketWeight, harvestThreshold, monitorThreshold },
    generatedBy: userId || null,
  };
}

module.exports = { generatePrediction, climateScoreFor, marketScoreFor, recommendationFor };
