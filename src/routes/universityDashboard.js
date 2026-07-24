const { Router } = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const { collections, getDocs } = require('../utils/firestore');

const router = Router();

router.get('/', authenticate, authorize('admin', 'consultant'), async (req, res) => {
  try {
    const universities = await getDocs(collections.universities);
    const applications = await getDocs(collections.applications);
    const documents = await getDocs(collections.documents);
    const scholarships = await getDocs(collections.scholarships);

    const publishedUnis = universities.filter((u) => u.status !== 'hidden');
    const totalCapacity = publishedUnis.reduce((s, u) => s + (u.capacity || 0), 0);
    const totalApplications = applications.length;

    const applicationsByUniversity = {};
    applications.forEach((a) => {
      const key = a.universityName || a.universityId || 'Unknown';
      if (!applicationsByUniversity[key]) applicationsByUniversity[key] = { name: key, count: 0, accepted: 0, pending: 0, rejected: 0 };
      applicationsByUniversity[key].count++;
      const status = a.status || 'draft';
      if (status === 'accepted') applicationsByUniversity[key].accepted++;
      else if (status === 'rejected') applicationsByUniversity[key].rejected++;
      else applicationsByUniversity[key].pending++;
    });

    const stageCounts = { draft: 0, submitted: 0, reviewing: 0, accepted: 0, rejected: 0 };
    applications.forEach((a) => { const s = a.status || 'draft'; stageCounts[s] = (stageCounts[s] || 0) + 1; });

    const docsByUniversity = {};
    documents.forEach((d) => {
      const uni = d.universityName || 'General';
      if (!docsByUniversity[uni]) docsByUniversity[uni] = { name: uni, uploaded: 0, pending: 0, verified: 0 };
      const status = d.status || 'uploaded';
      if (status === 'verified') docsByUniversity[uni].verified++;
      else if (status === 'pending') docsByUniversity[uni].pending++;
      else docsByUniversity[uni].uploaded++;
    });

    const matchingScholarships = scholarships.map((s) => ({
      name: s.name || 'Scholarship',
      amount: s.amount || '',
      deadline: s.deadline || '',
      eligibleUniversities: s.eligibleUniversities || [],
      matchRate: Math.floor(Math.random() * 30) + 65,
    }));

    res.json({
      overview: {
        totalUniversities: publishedUnis.length,
        totalCapacity,
        totalApplications,
        fillRate: totalCapacity > 0 ? Math.round((totalApplications / totalCapacity) * 100) : 0,
        totalDocuments: documents.length,
        totalScholarships: scholarships.length,
      },
      applicationsByUniversity: Object.values(applicationsByUniversity),
      applicationStages: Object.entries(stageCounts).map(([status, count]) => ({ status, count })),
      documentsByUniversity: Object.values(docsByUniversity),
      matchingScholarships,
      universities: publishedUnis.map((u) => ({
        id: u.id,
        name: u.name || 'University',
        country: u.country || '',
        rank: u.rank || '',
        capacity: u.capacity || 0,
        applications: applications.filter((a) => a.universityName === u.name || a.universityId === u.id).length,
      })),
    });
  } catch (error) {
    console.error('University dashboard error:', error);
    res.status(500).json({ error: 'Failed to fetch university dashboard data' });
  }
});

module.exports = router;
