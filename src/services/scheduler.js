const env = require('../config/env');
const { pollAllChannels } = require('./poller');
const { ingestMarketData } = require('./marketData');

let timers = [];

function start() {
  if (!env.schedulersEnabled) return;
  const t1 = setInterval(() => pollAllChannels().catch((e) => console.error('Erro no agendador do ThingSpeak:', e.message)), env.THINGSPEAK_POLL_INTERVAL_MS);
  const t2 = setInterval(() => ingestMarketData().catch((e) => console.error('Erro no agendador de mercado:', e.message)), env.MARKET_POLL_INTERVAL_MS);
  t1.unref(); t2.unref();
  timers = [t1, t2];
  
  pollAllChannels().catch((e) => console.error('Erro no agendador do ThingSpeak:', e.message));
  ingestMarketData().catch((e) => console.error('Erro no agendador de mercado:', e.message));
}

function stop() {
  timers.forEach(clearInterval);
  timers = [];
}

module.exports = { start, stop };
