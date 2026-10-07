const env = require('../config/env');

function simularFeeds() {
  const t = 24 + Math.sin(Date.now() / 3600000) * 8 + (Math.random() - 0.5) * 2;
  const h = 65 + Math.cos(Date.now() / 5400000) * 15 + (Math.random() - 0.5) * 5;
  return [{ created_at: new Date().toISOString(), field1: t.toFixed(2), field2: h.toFixed(2) }];
}

async function buscarFeeds(sensor) {
  if (!sensor.thingspeak_channel_id) return simularFeeds();

  try {
    const url = `${env.THINGSPEAK_BASE_URL}/channels/${encodeURIComponent(sensor.thingspeak_channel_id)}/feeds.json?results=8`;
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) throw new Error(`ThingSpeak respondeu ${res.status}`);
    const dados = await res.json();
    const feeds = Array.isArray(dados.feeds) ? dados.feeds : [];
    if (feeds.length) return feeds;
    throw new Error('canal sem nenhum dado publicado');
  } catch (erro) {

    if (env.thingspeakSimularSemCanal) return simularFeeds();
    throw erro;
  }
}

module.exports = { buscarFeeds };
