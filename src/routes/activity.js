const { Router } = require('express');
const { authenticate } = require('../middleware/auth');
const { collections, getDocs, addDoc, serverTimestamp } = require('../utils/firestore');

const router = Router();

router.get('/', authenticate, async (req, res) => {
  try {
    const activities = await getDocs(collections.activities, [
      { field: 'userId', op: '==', value: req.user.id },
    ], { field: 'createdAt', direction: 'desc' }, 20);
    res.json({ activities });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch activities' });
  }
});

router.post('/', authenticate, async (req, res) => {
  try {
    const activity = await addDoc(collections.activities, {
      userId: req.user.id,
      type: req.body.type || 'general',
      title: req.body.title,
      description: req.body.description,
      icon: req.body.icon,
      color: req.body.color,
      metadata: req.body.metadata || {},
      createdAt: serverTimestamp(),
    });
    res.status(201).json({ activity });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create activity' });
  }
});

module.exports = router;
