const mongoose = require('mongoose');


const fruitSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true, maxlength: 60 },
    tempMin: { type: Number, required: true, min: -30, max: 60 },
    tempMax: { type: Number, required: true, min: -30, max: 60 },
    humMin: { type: Number, required: true, min: 0, max: 100 },
    humMax: { type: Number, required: true, min: 0, max: 100 },
    notes: { type: String, trim: true, maxlength: 300 },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

fruitSchema.set('toJSON', {
  virtuals: true,
  transform: (_doc, ret) => {
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

fruitSchema.pre('validate', function () {
  if (this.tempMin >= this.tempMax) this.invalidate('tempMax', 'A temperatura máxima deve ser maior que a mínima');
  if (this.humMin >= this.humMax) this.invalidate('humMax', 'A umidade máxima deve ser maior que a mínima');
});

module.exports = mongoose.model('Fruit', fruitSchema);
