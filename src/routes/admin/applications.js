const { Router } = require('express');
const { authenticate, authorize } = require('../../middleware/auth');
const { collections, getDocs, getDoc } = require('../../utils/firestore');

const router = Router();

router.get('/', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { status } = req.query;
    let filters = [];
    if (status) filters.push({ field: 'status', op: '==', value: status });

    const apps = await getDocs(collections.applications, filters, { field: 'createdAt', direction: 'desc' });

    const enriched = await Promise.all(apps.map(async (a) => {
      const user = a.userId ? await getDoc(collections.users, a.userId) : null;
      return {
        ...a,
        userDisplayName: user?.displayName || 'Unknown',
        userEmail: user?.email || '',
      };
    }));

    res.json({ applications: enriched, total: enriched.length });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch applications' });
  }
});

module.exports = router;
