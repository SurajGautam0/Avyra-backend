const { Router } = require('express');
const { collections, getDocs, getDoc } = require('../utils/firestore');

const router = Router();

// GET /api/scholarships?country=&degree=&field=
router.get('/', async (req, res) => {
  try {
    const filters = [];
    if (req.query.country) filters.push({ field: 'country', op: '==', value: req.query.country });

    let scholarships = await getDocs(collections.scholarships, filters);

    if (req.query.degree) {
      scholarships = scholarships.filter((s) => s.degreeLevel?.includes(req.query.degree));
    }
    if (req.query.field) {
      scholarships = scholarships.filter((s) => s.fieldOfStudy?.includes(req.query.field));
    }

    res.json({ scholarships: scholarships.sort((a, b) => new Date(a.deadline) - new Date(b.deadline)).slice(0, 50) });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch scholarships' });
  }
});

// GET /api/scholarships/:id
router.get('/:id', async (req, res) => {
  try {
    const scholarship = await getDoc(collections.scholarships, req.params.id);
    if (!scholarship) return res.status(404).json({ error: 'Scholarship not found' });
    res.json({ scholarship });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch scholarship' });
  }
});

module.exports = router;
