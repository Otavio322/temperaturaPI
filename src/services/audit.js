
const AuditLog = require('../models/AuditLog');

async function record({ req, user, action, success = true, detail }) {
  try {
    await AuditLog.create({
      user: user?._id || user?.id || null,
      email: user?.email || req?.body?.email || undefined,
      action,
      success,
      ip: req?.ip,
      detail,
    });
  } catch (err) {
    console.error('Falha ao gravar log de auditoria:', err.message);
  }
}

module.exports = { record };
