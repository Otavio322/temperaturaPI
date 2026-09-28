const mongoose = require('mongoose');



const predictionSchema = new mongoose.Schema(
  {
    fruit: { type: mongoose.Schema.Types.ObjectId, ref: 'Fruit', required: true, index: true },
    device: { type: mongoose.Schema.Types.ObjectId, ref: 'Device', default: null },
    climateScore: { type: Number, min: 0, max: 100, required: true }, 
    marketScore: { type: Number, min: 0, max: 100, required: true },
    combinedScore: { type: Number, min: 0, max: 100, required: true },
    recommendation: { type: String, enum: ['colher_agora', 'monitorar', 'aguardar'], required: true },
    windowStart: { type: Date, required: true },
    windowEnd: { type: Date, required: true },
    rationale: { type: String, maxlength: 400 },
    generatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: { createdAt: 'generatedAt', updatedAt: false }, versionKey: false }
);

predictionSchema.index({ fruit: 1, generatedAt: -1 });

predictionSchema.set('toJSON', {
  transform: (_doc, ret) => { ret.id = ret._id; delete ret._id; return ret; },
});

module.exports = mongoose.model('Prediction', predictionSchema);
