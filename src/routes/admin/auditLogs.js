const { Router } = require('express');
const { authenticate, authorize } = require('../../middleware/auth');
const { collections, getDocs, getDoc } = require('../../utils/firestore');

const router = Router();

router.get('/', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const logs = await getDocs(collections.auditLogs, [], { field: 'createdAt', direction: 'desc' }, parseInt(limit));

    const enriched = await Promise.all(logs.map(async (log) => {
      if (log.userId) {
        const user = await getDoc(collections.users, log.userId);
        return { ...log, user: user ? { id: user.id, displayName: user.displayName, email: user.email, role: user.role } : null };
      }
      return log;
    }));

    res.json({ logs: enriched, total: enriched.length, page: parseInt(page), limit: parseInt(limit) });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});

router.get('/export', authenticate, authorize('admin'), async (req, res) => {
  try {
    const logs = await getDocs(collections.auditLogs, [], { field: 'createdAt', direction: 'desc' }, 1000);

    const enriched = await Promise.all(logs.map(async (log) => {
      let userDisplayName = 'N/A', userEmail = 'N/A';
      if (log.userId) {
        const user = await getDoc(collections.users, log.userId);
        if (user) { userDisplayName = user.displayName || 'N/A'; userEmail = user.email || 'N/A'; }
      }
      return { ...log, userDisplayName, userEmail };
    }));

    const csv = [
      'Timestamp,User,Email,Role,Action,Resource,Severity',
      ...enriched.map((l) =>
        `${l.createdAt || ''},${l.userDisplayName},${l.userEmail},${l.role || ''},${l.action},${l.resource || ''},${l.severity}`
      ),
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=audit-log.csv');
    res.send(csv);
  } catch (error) {
    res.status(500).json({ error: 'Export failed' });
  }
});

module.exports = router;
