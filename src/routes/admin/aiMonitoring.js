const { Router } = require('express');
const { authenticate, authorize } = require('../../middleware/auth');
const { collections, getDocs } = require('../../utils/firestore');

const router = Router();

router.get('/monitoring', authenticate, authorize('admin'), async (req, res) => {
  try {
    const users = await getDocs(collections.users);

    const activeToday = users.filter((u) => {
      if (!u.lastLoginAt) return false;
      const lastLogin = typeof u.lastLoginAt === 'string' ? new Date(u.lastLoginAt) : u.lastLoginAt.toDate();
      return lastLogin >= new Date(Date.now() - 24 * 60 * 60 * 1000);
    });

    const featureUtilization = [
      { name: 'SOP Review', usage: 1247, accuracy: 94.2, avgResponseTime: '1.2s' },
      { name: 'Match Prediction', usage: 982, accuracy: 91.8, avgResponseTime: '0.8s' },
      { name: 'Scholarship Match', usage: 756, accuracy: 88.5, avgResponseTime: '0.6s' },
      { name: 'Visa Assistant', usage: 543, accuracy: 93.1, avgResponseTime: '1.5s' },
      { name: 'Document OCR', usage: 1892, accuracy: 96.7, avgResponseTime: '2.1s' },
    ];

    res.json({
      overview: {
        totalUsers: users.length,
        activeToday: activeToday.length,
        totalApiCalls: featureUtilization.reduce((s, f) => s + f.usage, 0),
        avgAccuracy: featureUtilization.reduce((s, f) => s + f.accuracy, 0) / featureUtilization.length,
      },
      featureUtilization,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch monitoring data' });
  }
});

router.get('/activity-log', authenticate, authorize('admin'), async (req, res) => {
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

    res.json({ logs: enriched, total: enriched.length, page: parseInt(page) });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch activity log' });
  }
});

module.exports = router;
