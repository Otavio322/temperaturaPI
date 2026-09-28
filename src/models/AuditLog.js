const mongoose = require('mongoose');


const auditLogSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    email: { type: String, maxlength: 120 }, 
    action: { type: String, required: true, maxlength: 60 }, 
    detail: { type: String, maxlength: 300 },
  },
  { timestamps: { createdAt: true, updatedAt: false }, versionKey: false }
);

auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 365 * 86400 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
