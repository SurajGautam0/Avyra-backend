const { Router } = require('express');
const { body } = require('express-validator');
const validate = require('../../middleware/validate');
const { authenticate, authorize } = require('../../middleware/auth');
const { collections, getDocs, getDoc, setDoc, serverTimestamp } = require('../../utils/firestore');

const router = Router();

router.get('/pending', authenticate, authorize('consultant', 'admin'), async (req, res) => {
  try {
    const docs = await getDocs(collections.documents, [
      { field: 'status', op: '==', value: 'uploaded' },
    ], { field: 'createdAt', direction: 'asc' });

    const enriched = await Promise.all(docs.map(async (doc) => {
      const user = await getDoc(collections.users, doc.userId);
      return { ...doc, user: user ? { id: user.id, displayName: user.displayName, email: user.email } : null };
    }));

    res.json({ queue: enriched, total: enriched.length });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch pending documents' });
  }
});

router.put('/:id/verify', authenticate, authorize('consultant', 'admin'), [
  body('status').isIn(['verified', 'rejected']),
  body('notes').optional().isString(),
  validate,
], async (req, res) => {
  try {
    const doc = await getDoc(collections.documents, req.params.id);
    if (!doc) return res.status(404).json({ error: 'Document not found' });

    await setDoc(collections.documents, req.params.id, {
      status: req.body.status,
      'verification.verifiedBy': req.user.id,
      'verification.verifiedAt': new Date().toISOString(),
      'verification.notes': req.body.notes || '',
    });

    const updated = await getDoc(collections.documents, req.params.id);
    res.json({ document: updated });
  } catch (error) {
    res.status(500).json({ error: 'Verification failed' });
  }
});

module.exports = router;
