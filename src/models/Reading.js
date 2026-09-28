const mongoose = require('mongoose');
const env = require('../config/env');


const readingSchema = new mongoose.Schema(
  {
    device: { type: mongoose.Schema.Types.ObjectId, ref: 'Device', required: true },
    temperature: { type: Number, required: true, min: -40, max: 85 },
    humidity: { type: Number, required: true, min: 0, max: 100 },
    source: { type: String, enum: ['thingspeak', 'simulado'], default: 'thingspeak' },
    flags: [{ type: String }],
    thingSpeakEntryId: { type: Number },
  },
  { timestamps: { createdAt: true, updatedAt: false }, versionKey: false }
);

readingSchema.index({ device: 1, createdAt: -1 });

readingSchema.index({ createdAt: 1 }, { expireAfterSeconds: env.READINGS_TTL_DAYS * 86400 });

module.exports = mongoose.model('Reading', readingSchema);
