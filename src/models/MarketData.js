const mongoose = require('mongoose');


const marketDataSchema = new mongoose.Schema(
  {
    fruit: { type: mongoose.Schema.Types.ObjectId, ref: 'Fruit', required: true, index: true },
    price: { type: Number, required: true, min: 0 }, // preço de referência (USD/kg)
    demandIndex: { type: Number, required: true, min: 0, max: 100 }, // 0 = sem demanda, 100 = demanda máxima
    source: { type: String, enum: ['simulado', 'externo'], default: 'simulado' },
    recordedAt: { type: Date, default: Date.now, index: true },
  },
  { versionKey: false }
);

marketDataSchema.index({ fruit: 1, recordedAt: -1 });

marketDataSchema.set('toJSON', {
  transform: (_doc, ret) => { ret.id = ret._id; delete ret._id; return ret; },
});

module.exports = mongoose.model('MarketData', marketDataSchema);
