const { Router } = require('express');
const { authenticate, authorize } = require('../../middleware/auth');
const { collections, getDocs } = require('../../utils/firestore');

const router = Router();

router.get('/', authenticate, authorize('consultant', 'admin'), async (req, res) => {
  try {
    const students = await getDocs(collections.users, [{ field: 'role', op: '==', value: 'student' }]);
    const apps = await getDocs(collections.applications);

    const totalStudents = students.length;
    const totalApplications = apps.length;
    const verifiedStudents = students.filter((s) => s.kycStatus === 'verified').length;

    const eligibility = {
      excellent: students.filter((s) => (s.eligibilityScore || 0) >= 80).length,
      good: students.filter((s) => (s.eligibilityScore || 0) >= 60 && (s.eligibilityScore || 0) < 80).length,
      average: students.filter((s) => (s.eligibilityScore || 0) >= 40 && (s.eligibilityScore || 0) < 60).length,
      low: students.filter((s) => (s.eligibilityScore || 0) < 40).length,
    };

    const destCount = {};
    students.forEach((s) => (s.selectedCountries || []).forEach((c) => { destCount[c] = (destCount[c] || 0) + 1; }));
    const topDestinations = Object.entries(destCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));

    res.json({ overview: { totalStudents, totalApplications, verifiedStudents }, eligibilityDistribution: eligibility, topDestinations });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch insights' });
  }
});

module.exports = router;
