
const path = require('path');
const { spawnSync } = require('child_process');
const router = require('express').Router();
const AuditLog = require('../models/AuditLog');
const { authenticate, authorize } = require('../middleware/auth');
const { asyncHandler } = require('../utils/httpError');

router.use(authenticate, authorize('admin'));


router.get('/security', asyncHandler(async (req, res) => {
  const days = Math.min(90, Math.max(1, Number(req.query.days) || 30));
  const since = new Date(Date.now() - days * 86400 * 1000);

  const [byAction, recentFailures] = await Promise.all([
    AuditLog.aggregate([
      { $match: { createdAt: { $gte: since } } },
      { $group: { _id: { action: '$action', success: '$success' }, count: { $sum: 1 } } },
      { $project: { _id: 0, action: '$_id.action', success: '$_id.success', count: 1 } },
      { $sort: { count: -1 } },
    ]),
    AuditLog.find({ createdAt: { $gte: since }, success: false }).sort({ createdAt: -1 }).limit(50),
  ]);

  res.json({ periodDays: days, byAction, recentIncidents: recentFailures });
}));


router.post('/quality/run', asyncHandler(async (req, res) => {
  const glob = require('fs').readdirSync(path.join(__dirname, '..', '..', 'tests', 'unit'))
    .filter((f) => f.endsWith('.test.js'))
    .map((f) => path.join(__dirname, '..', '..', 'tests', 'unit', f));
  const start = Date.now();
  const result = spawnSync(process.execPath, ['--test', '--test-reporter=tap', ...glob], {
    encoding: 'utf8',
    timeout: 60000,
  });
  const output = `${result.stdout || ''}\n${result.stderr || ''}`;
  const pass = Number((output.match(/# pass (\d+)/) || [])[1] || 0);
  const fail = Number((output.match(/# fail (\d+)/) || [])[1] || 0);
  const total = Number((output.match(/# tests (\d+)/) || [])[1] || pass + fail);

  res.json({
    ranAt: new Date().toISOString(),
    durationMs: Date.now() - start,
    total,
    pass,
    fail,
    ok: result.status === 0,
  });
}));

module.exports = router;
