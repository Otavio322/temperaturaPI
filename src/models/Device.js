const mongoose = require('mongoose');
const { encrypt, decrypt, maskTail } = require('../config/crypto');


const deviceSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    location: { type: String, trim: true, maxlength: 120 },
    fruit: { type: mongoose.Schema.Types.ObjectId, ref: 'Fruit', default: null },
    
    clients: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true }],

    
    thingSpeakChannelId: { type: String, trim: true, maxlength: 40 },
    
    thingSpeakReadApiKeyEnc: { type: String, select: false },
    fieldTemperature: { type: String, default: 'field1', maxlength: 10 }, 
    fieldHumidity: { type: String, default: 'field2', maxlength: 10 },    
    simulate: { type: Boolean, default: true },
    lastFeedEntryId: { type: Number, default: 0 }, 

    active: { type: Boolean, default: true },
    lastPolledAt: { type: Date },
    lastPollError: { type: String, maxlength: 300 },
  },
  { timestamps: true }
);

deviceSchema.virtual('thingSpeakReadApiKeyPlain').get(function () {
  return this.thingSpeakReadApiKeyEnc ? decrypt(this.thingSpeakReadApiKeyEnc) : null;
});
deviceSchema.methods.setThingSpeakReadApiKey = function (plain) {
  this.thingSpeakReadApiKeyEnc = plain ? encrypt(plain) : undefined;
};

deviceSchema.set('toJSON', {
  virtuals: true,
  transform: (_doc, ret) => {
    
    ret.thingSpeakReadApiKeyMasked = maskTail(ret.thingSpeakReadApiKeyPlain);
    delete ret.thingSpeakReadApiKeyEnc;
    delete ret.thingSpeakReadApiKeyPlain; 
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model('Device', deviceSchema);
