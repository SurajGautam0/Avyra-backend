const { Router } = require('express');
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const { setDoc, getDoc, collections } = require('../utils/firestore');

const router = Router();

const COUNTRIES = [
  'Australia', 'Canada', 'United Kingdom', 'United States', 'New Zealand',
  'Germany', 'France', 'Ireland', 'Netherlands', 'Sweden',
  'Singapore', 'Japan', 'South Korea', 'United Arab Emirates',
  'Malaysia', 'Switzerland', 'Italy', 'Spain',
];

router.get('/', (req, res) => res.json({ countries: COUNTRIES }));

router.put('/select', authenticate, [
  body('selectedCountries').isArray({ min: 1, max: 3 }),
  body('selectedCountries.*').isString(),
  validate,
], async (req, res) => {
  try {
    await setDoc(collections.users, req.user.id, { selectedCountries: req.body.selectedCountries });
    const user = await getDoc(collections.users, req.user.id);
    res.json({ user, message: 'Countries selected' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to save selection' });
  }
});

module.exports = router;
