const Device = require('../models/Device');
const Reading = require('../models/Reading');
const { fetchNewFeeds } = require('./thingspeak');
const { cleanReading } = require('./dataCleaning');
const { evaluate } = require('../utils/status');
const { record: audit } = require('./audit');

async function pollChannel(device) {
  const feeds = await fetchNewFeeds(device);
  if (!feeds.length) return { stored: 0 };

  let previous = await Reading.findOne({ device: device._id }).sort({ createdAt: -1 }).lean();
  let stored = 0;
  let maxEntryId = device.lastFeedEntryId || 0;

  for (const feed of feeds.sort((a, b) => (a.entry_id || 0) - (b.entry_id || 0))) {
    const raw = { temperature: Number(feed[device.fieldTemperature || 'field1']), humidity: Number(feed[device.fieldHumidity || 'field2']) };
    const cleaned = cleanReading(raw, previous);
    if (feed.entry_id) maxEntryId = Math.max(maxEntryId, feed.entry_id);
    if (!cleaned.ok) continue; 

    const reading = await Reading.create({
      device: device._id,
      temperature: cleaned.temperature,
      humidity: cleaned.humidity,
      source: device.simulate ? 'simulado' : 'thingspeak',
      flags: cleaned.flags,
      thingSpeakEntryId: feed.entry_id,
      createdAt: feed.created_at ? new Date(feed.created_at) : undefined,
    });
    previous = reading;
    stored += 1;

    const evaluation = evaluate(cleaned.temperature, cleaned.humidity, device.fruit);
    if (evaluation.status === 'alerta') {
      await audit({ action: 'alerta_climatico', detail: `${device.name}: ${evaluation.issues.join(', ')}`, success: false });
    }
  }

  device.lastFeedEntryId = maxEntryId;
  device.lastPolledAt = new Date();
  device.lastPollError = undefined;
  await device.save();
  return { stored };
}

async function pollAllChannels() {
  const devices = await Device.find({ active: true }).select('+thingSpeakReadApiKeyEnc').populate('fruit');
  const results = [];
  for (const device of devices) {
    try {
      results.push({ device: device.id, ...(await pollChannel(device)) });
    } catch (err) {
      device.lastPollError = err.message.slice(0, 300);
      device.lastPolledAt = new Date();
      await device.save().catch(() => {});
      await audit({ action: 'falha_ingestao_thingspeak', detail: `${device.name}: ${err.message}`, success: false });
      results.push({ device: device.id, error: err.message });
    }
  }
  return results;
}

module.exports = { pollChannel, pollAllChannels };
