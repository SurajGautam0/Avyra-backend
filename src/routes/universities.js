const { Router } = require('express');
const { collections, getDocs, getDoc } = require('../utils/firestore');

const router = Router();

// GET /api/universities?country=&search=
router.get('/', async (req, res) => {
  try {
    const filters = [];
    if (req.query.country) filters.push({ field: 'country', op: '==', value: req.query.country });

    let universities = await getDocs(collections.universities, filters);

    if (req.query.search) {
      const q = req.query.search.toLowerCase();
      universities = universities.filter(
        (u) => u.name?.toLowerCase().includes(q) || u.description?.toLowerCase().includes(q)
      );
    }

    res.json({ universities: universities.sort((a, b) => (a.rank || 999) - (b.rank || 999)).slice(0, 50) });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch universities' });
  }
});

// GET /api/universities/:id
router.get('/:id', async (req, res) => {
  try {
    const uni = await getDoc(collections.universities, req.params.id);
    if (!uni) return res.status(404).json({ error: 'University not found' });
    res.json({ university: uni });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch university' });
  }
});

module.exports = router;
