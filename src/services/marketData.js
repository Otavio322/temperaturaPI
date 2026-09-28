
const env = require('../config/env');
const Fruit = require('../models/Fruit');
const MarketData = require('../models/MarketData');

async function simulateOnePoint(fruit, previous) {
  const basePrice = previous?.price ?? 2 + Math.random() * 3;
  const price = Math.max(0.2, basePrice + (Math.random() - 0.5) * 0.3);
  const demandIndex = Math.min(100, Math.max(0, (previous?.demandIndex ?? 50) + (Math.random() - 0.5) * 15));
  return MarketData.create({ fruit: fruit._id, price: Math.round(price * 100) / 100, demandIndex: Math.round(demandIndex), source: 'simulado' });
}


async function ingestMarketData() {
  const fruits = await Fruit.find();
  const created = [];
  for (const fruit of fruits) {
    if (!env.marketSimulate) continue; 
    const previous = await MarketData.findOne({ fruit: fruit._id }).sort({ recordedAt: -1 });
    created.push(await simulateOnePoint(fruit, previous));
  }
  return created;
}

module.exports = { ingestMarketData };
