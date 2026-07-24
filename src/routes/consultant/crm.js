const { Router } = require('express');
const { authenticate, authorize } = require('../../middleware/auth');
const { collections, getDocs, getDoc } = require('../../utils/firestore');

const router = Router();

router.get('/students', authenticate, authorize('consultant', 'admin'), async (req, res) => {
  try {
    const { status, search } = req.query;

    let students = await getDocs(collections.users, [
      { field: 'role', op: '==', value: 'student' },
    ], { field: 'createdAt', direction: 'desc' });

    if (status) students = students.filter((s) => s.status === status);
    if (search) {
      const q = search.toLowerCase();
      students = students.filter((s) => (s.displayName || '').toLowerCase().includes(q));
    }

    const enriched = await Promise.all(students.map(async (s) => {
      const apps = await getDocs(collections.applications, [{ field: 'userId', op: '==', value: s.id }]);
      const docs = await getDocs(collections.documents, [{ field: 'userId', op: '==', value: s.id }]);
      const { password, otpCode, otpExpiresAt, refreshToken, ...safe } = s;
      return { ...safe, applicationCount: apps.length, documentCount: docs.length };
    }));

    res.json({ students: enriched, total: enriched.length });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch students' });
  }
});

router.get('/students/:id', authenticate, authorize('consultant', 'admin'), async (req, res) => {
  try {
    const student = await getDoc(collections.users, req.params.id);
    if (!student || student.role !== 'student') return res.status(404).json({ error: 'Student not found' });

    const applications = await getDocs(collections.applications, [
      { field: 'userId', op: '==', value: req.params.id },
    ], { field: 'createdAt', direction: 'desc' });

    const documents = await getDocs(collections.documents, [
      { field: 'userId', op: '==', value: req.params.id },
    ]);

    const { password, otpCode, otpExpiresAt, refreshToken, ...safe } = student;
    res.json({ student: safe, applications, documents });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch student' });
  }
});

module.exports = router;
