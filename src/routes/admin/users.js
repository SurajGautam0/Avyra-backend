const { Router } = require('express');
const { body } = require('express-validator');
const validate = require('../../middleware/validate');
const { authenticate, authorize } = require('../../middleware/auth');
const { collections, getDocs, getDoc, setDoc, queryOne } = require('../../utils/firestore');

const router = Router();

router.get('/', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { role, status, search, sort } = req.query;
    let users = await getDocs(collections.users);

    if (role) users = users.filter(u => u.role === role);
    if (status) users = users.filter(u => u.status === status);
    if (search) {
      const q = search.toLowerCase();
      users = users.filter(u =>
        (u.displayName || '').toLowerCase().includes(q) ||
        (u.email || '').toLowerCase().includes(q)
      );
    }

    users.forEach(u => { delete u.password; delete u.otpCode; delete u.otpExpiresAt; delete u.refreshToken; });

    if (sort === 'newest') users.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    else if (sort === 'oldest') users.sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
    else users.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

    res.json({ users, total: users.length });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

router.put('/:id/status', authenticate, authorize('admin'), [
  body('status').isIn(['active', 'suspended', 'pending']),
  validate,
], async (req, res) => {
  try {
    await setDoc(collections.users, req.params.id, { status: req.body.status });
    const user = await getDoc(collections.users, req.params.id);
    if (user) { delete user.password; delete user.otpCode; delete user.otpExpiresAt; delete user.refreshToken; }
    res.json({ user });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update user status' });
  }
});

module.exports = router;
