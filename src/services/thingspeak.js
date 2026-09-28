
const env = require('../config/env');


function simulateFeeds({ channel, sinceEntryId }) {
  const startEntry = (sinceEntryId || 0) + 1;
  const count = 1; 
  const base = channel.simSeed ?? 24;
  const feeds = [];
  for (let i = 0; i < count; i++) {
    const t = base + Math.sin(Date.now() / 3600000) * 4 + (Math.random() - 0.5) * 1.5;
    const h = 70 + Math.cos(Date.now() / 5400000) * 15 + (Math.random() - 0.5) * 4;
    feeds.push({
      entry_id: startEntry + i,
      created_at: new Date().toISOString(),
      field1: t.toFixed(1),
      field2: h.toFixed(1),
    });
  }
  return feeds;
}


async function fetchNewFeeds(channel) {
  if (channel.simulate) return simulateFeeds({ channel, sinceEntryId: channel.lastFeedEntryId });
  if (!channel.thingSpeakChannelId) return [];

  const readKey = channel.thingSpeakReadApiKeyPlain; 
  const params = new URLSearchParams({ results: '8' });
  if (readKey) params.set('api_key', readKey);
  const url = `${env.THINGSPEAK_BASE_URL}/channels/${encodeURIComponent(channel.thingSpeakChannelId)}/feeds.json?${params}`;

  const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
  if (!res.ok) throw new Error(`ThingSpeak respondeu ${res.status}`);
  const data = await res.json();
  const feeds = Array.isArray(data.feeds) ? data.feeds : [];
  return channel.lastFeedEntryId ? feeds.filter((f) => f.entry_id > channel.lastFeedEntryId) : feeds;
}

module.exports = { fetchNewFeeds };
