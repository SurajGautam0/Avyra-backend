const { Router } = require('express');
const { body } = require('express-validator');
const validate = require('../../middleware/validate');
const { authenticate, authorize } = require('../../middleware/auth');
const { collections, getDocs, getDoc, setDoc, addDoc, serverTimestamp } = require('../../utils/firestore');

const router = Router();

const PERMISSIONS = [
  'students:read', 'students:write',
  'documents:read', 'documents:verify',
  'applications:read', 'applications:write',
  'kyc:read', 'kyc:verify',
  'ai:read', 'ai:configure',
  'roles:read', 'roles:write',
  'audit:read', 'audit:export',
  'settings:read', 'settings:write',
];

const ROLE_PERMISSIONS = {
  admin: PERMISSIONS,
  consultant: ['students:read', 'students:write', 'documents:read', 'documents:verify',
    'applications:read', 'applications:write', 'kyc:read', 'ai:read'],
  student: ['documents:read', 'applications:read', 'applications:write'],
};

router.get('/', authenticate, authorize('admin'), async (req, res) => {
  try {
    const users = await getDocs(collections.users);
    const roles = Object.entries(ROLE_PERMISSIONS).map(([name, permissions]) => ({
      name,
      permissions,
      userCount: users.filter((u) => u.role === name).length,
    }));

    res.json({ roles, allPermissions: PERMISSIONS });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch roles' });
  }
});

router.put('/users/:id/role', authenticate, authorize('admin'), [
  body('role').isIn(['student', 'consultant', 'admin']),
  validate,
], async (req, res) => {
  try {
    await setDoc(collections.users, req.params.id, { role: req.body.role });
    const user = await getDoc(collections.users, req.params.id);

    await addDoc(collections.auditLogs, {
      userId: req.user.id,
      action: 'role-update',
      resource: 'user',
      resourceId: req.params.id,
      details: { newRole: req.body.role },
      role: 'admin',
      createdAt: serverTimestamp(),
    });

    const { password, otpCode, otpExpiresAt, refreshToken, ...safe } = user;
    res.json({ user: safe });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update role' });
  }
});

module.exports = router;
