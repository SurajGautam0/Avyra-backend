const { Router } = require('express');
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const { collections, getDocs, getDoc, addDoc, setDoc, serverTimestamp } = require('../utils/firestore');

const router = Router();

const STAGES = [
  'Profile', 'Documents', 'SOP', 'University Shortlist', 'Application',
  'Offer', 'COE', 'Visa Documents', 'Visa Application', 'Visa Interview',
  'Medical', 'Travel Prep', 'Ready to Fly',
];

const getDefaultStages = () => STAGES.map((name, i) => ({ name, order: i + 1, status: 'pending' }));

// GET /api/applications
router.get('/', authenticate, async (req, res) => {
  try {
    const apps = await getDocs(collections.applications, [
      { field: 'userId', op: '==', value: req.user.id },
    ], { field: 'createdAt', direction: 'desc' });
    res.json({ applications: apps, totalStages: 13 });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch applications' });
  }
});

// POST /api/applications
router.post('/', authenticate, [
  body('universityName').trim().notEmpty(),
  body('courseName').trim().notEmpty(),
  validate,
], async (req, res) => {
  try {
    const app = await addDoc(collections.applications, {
      userId: req.user.id,
      universityName: req.body.universityName,
      courseName: req.body.courseName,
      intake: req.body.intake || '',
      status: 'draft',
      stages: getDefaultStages(),
      currentStage: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    res.status(201).json({ application: app });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create application' });
  }
});

// GET /api/applications/:id
router.get('/:id', authenticate, async (req, res) => {
  try {
    const app = await getDoc(collections.applications, req.params.id);
    if (!app || app.userId !== req.user.id) return res.status(404).json({ error: 'Application not found' });
    res.json({ application: app });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch application' });
  }
});

// PUT /api/applications/:id/stage
router.put('/:id/stage', authenticate, [
  body('stageIndex').isInt({ min: 0, max: 12 }),
  body('status').isIn(['pending', 'in-progress', 'completed', 'blocked']),
  validate,
], async (req, res) => {
  try {
    const app = await getDoc(collections.applications, req.params.id);
    if (!app || app.userId !== req.user.id) return res.status(404).json({ error: 'Application not found' });

    const stageKey = `stages.${req.body.stageIndex}`;
    const updateData = {
      [`${stageKey}.status`]: req.body.status,
      updatedAt: serverTimestamp(),
    };
    if (req.body.status === 'completed') {
      updateData[`${stageKey}.completedAt`] = new Date().toISOString();
    }

    const newCurrent = Math.max(app.currentStage || 0, req.body.stageIndex);
    updateData.currentStage = newCurrent;

    await setDoc(collections.applications, req.params.id, updateData);
    const updated = await getDoc(collections.applications, req.params.id);
    res.json({ application: updated });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update stage' });
  }
});

module.exports = router;
