const { Router } = require('express');
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const { collections, getDocs, getDoc, addDoc, setDoc, queryOne, serverTimestamp } = require('../utils/firestore');

const router = Router();

const DEFAULT_ITEMS = [
  { name: 'Valid Passport', isRequired: true },
  { name: 'Acceptance Letter (CoE)', isRequired: true },
  { name: 'Proof of Funds', isRequired: true },
  { name: 'Health Insurance (OSHC)', isRequired: true },
  { name: 'English Proficiency Test', isRequired: true },
  { name: 'Visa Application Form', isRequired: true },
  { name: 'Passport-sized Photos', isRequired: true },
  { name: 'Statement of Purpose', isRequired: true },
  { name: 'Academic Transcripts', isRequired: true },
  { name: 'Medical Examination Report', isRequired: false },
];

// GET /api/visa/checklist?country=
router.get('/checklist', authenticate, async (req, res) => {
  try {
    const country = req.query.country || req.user.preferences?.primaryDestination || 'Australia';
    let checklist = await queryOne(collections.visaChecklists, 'userId', '==', req.user.id);

    if (!checklist) {
      checklist = await addDoc(collections.visaChecklists, {
        userId: req.user.id,
        country,
        items: DEFAULT_ITEMS.map((item) => ({ ...item, status: 'pending', id: require('crypto').randomUUID() })),
        overallProgress: 0,
        createdAt: serverTimestamp(),
      });
    }

    res.json({ checklist });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch visa checklist' });
  }
});

// PUT /api/visa/checklist/item
router.put('/checklist/item', authenticate, [
  body('itemId').isString().notEmpty(),
  body('status').isIn(['pending', 'in-progress', 'completed']),
  validate,
], async (req, res) => {
  try {
    const country = req.query.country || req.user.preferences?.primaryDestination || 'Australia';
    let checklist = await queryOne(collections.visaChecklists, 'userId', '==', req.user.id);
    if (!checklist) return res.status(404).json({ error: 'Checklist not found' });

    const itemIndex = checklist.items.findIndex((i) => i.id === req.body.itemId);
    if (itemIndex === -1) return res.status(404).json({ error: 'Item not found' });

    const updateKey = `items.${itemIndex}.status`;
    const completedKey = `items.${itemIndex}.completedAt`;

    const updateData = { [updateKey]: req.body.status };
    if (req.body.status === 'completed') updateData[completedKey] = new Date().toISOString();

    const completed = checklist.items.reduce((count, item, idx) => {
      const status = idx === itemIndex ? req.body.status : item.status;
      return count + (status === 'completed' ? 1 : 0);
    }, 0);
    updateData.overallProgress = Math.round((completed / checklist.items.length) * 100);

    await setDoc(collections.visaChecklists, checklist.id, updateData);
    const updated = await getDoc(collections.visaChecklists, checklist.id);
    res.json({ checklist: updated });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update item' });
  }
});

module.exports = router;
