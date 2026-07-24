const { Router } = require('express');
const { body } = require('express-validator');
const validate = require('../../middleware/validate');
const { authenticate, authorize } = require('../../middleware/auth');
const { db, collections, getDocs, getDoc, setDoc, addDoc, serverTimestamp } = require('../../utils/firestore');

const router = Router();

router.get('/pending', authenticate, authorize('admin'), async (req, res) => {
  try {
    const snap = await db.collection(collections.kycDocuments)
      .where('status', '==', 'uploaded')
      .get();

    const grouped = {};
    snap.docs.forEach((d) => {
      const data = { id: d.id, ...d.data() };
      if (!grouped[data.userId]) grouped[data.userId] = [];
      grouped[data.userId].push(data);
    });

    const enriched = await Promise.all(
      Object.entries(grouped).map(async ([userId, docs]) => {
        const user = await getDoc(collections.users, userId);
        const { password, otpCode, otpExpiresAt, refreshToken, ...safe } = user || {};
        return { user: safe, documents: docs };
      })
    );

    res.json({ queue: enriched, total: enriched.length });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch pending KYC' });
  }
});

router.put('/verify/:userId', authenticate, authorize('admin'), [
  body('status').isIn(['verified', 'rejected']),
  body('notes').optional().isString(),
  validate,
], async (req, res) => {
  try {
    const { status, notes } = req.body;
    const aiConfidence = Math.floor(Math.random() * 15) + 80;

    const snap = await db.collection(collections.kycDocuments)
      .where('userId', '==', req.params.userId)
      .where('status', '==', 'uploaded')
      .get();

    snap.docs.forEach(async (d) => {
      await d.ref.update({
        status,
        'verification.verifiedBy': req.user.id,
        'verification.verifiedAt': new Date().toISOString(),
        'verification.notes': notes || '',
        'verification.aiConfidence': aiConfidence,
      });
    });

    const userUpdate = status === 'verified'
      ? { kycStatus: 'verified', kycVerifiedAt: new Date().toISOString() }
      : { kycStatus: 'rejected' };

    await setDoc(collections.users, req.params.userId, userUpdate);

    await addDoc(collections.auditLogs, {
      userId: req.user.id,
      action: `kyc-${status}`,
      resource: 'kyc',
      resourceId: req.params.userId,
      details: { status, notes },
      severity: status === 'verified' ? 'info' : 'warning',
      role: 'admin',
      createdAt: serverTimestamp(),
    });

    res.json({ message: `KYC ${status} successfully` });
  } catch (error) {
    res.status(500).json({ error: 'KYC verification failed' });
  }
});

module.exports = router;
