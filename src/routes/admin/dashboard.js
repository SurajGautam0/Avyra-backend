const { Router } = require('express');
const { authenticate, authorize } = require('../../middleware/auth');
const { db, collections, getDocs, getDoc, queryOne } = require('../../utils/firestore');

const router = Router();

router.get('/', authenticate, authorize('admin'), async (req, res) => {
  try {
    const users = await getDocs(collections.users);
    const applications = await getDocs(collections.applications);
    const documents = await getDocs(collections.documents);
    const universities = await getDocs(collections.universities);
    const scholarships = await getDocs(collections.scholarships);
    const kycSnap = await db.collection(collections.kycDocuments).where('status', '==', 'uploaded').get();
    const audits = await getDocs(collections.auditLogs, [], { field: 'createdAt', direction: 'desc' }, 10);

    const activeToday = users.filter((u) => {
      if (!u.lastLoginAt) return false;
      const lastLogin = typeof u.lastLoginAt === 'string' ? new Date(u.lastLoginAt) : u.lastLoginAt.toDate();
      return lastLogin >= new Date(Date.now() - 24 * 60 * 60 * 1000);
    });

    const roleCounts = { admin: 0, consultant: 0, student: 0 };
    users.forEach((u) => { if (roleCounts[u.role] !== undefined) roleCounts[u.role]++; });

    const stageCounts = { draft: 0, submitted: 0, reviewing: 0, accepted: 0, rejected: 0 };
    applications.forEach((a) => { const s = a.status || 'draft'; stageCounts[s] = (stageCounts[s] || 0) + 1; });

    const docsByType = {};
    documents.forEach((d) => {
      const t = d.category || d.type || 'other';
      docsByType[t] = (docsByType[t] || 0) + 1;
    });

    const monthlySignups = {};
    users.forEach((u) => {
      if (u.createdAt) {
        const d = typeof u.createdAt === 'string' ? new Date(u.createdAt) : u.createdAt.toDate();
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        monthlySignups[key] = (monthlySignups[key] || 0) + 1;
      }
    });

    const monthlyApplications = {};
    applications.forEach((a) => {
      if (a.createdAt) {
        const d = typeof a.createdAt === 'string' ? new Date(a.createdAt) : a.createdAt.toDate();
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        monthlyApplications[key] = (monthlyApplications[key] || 0) + 1;
      }
    });

    res.json({
      overview: {
        totalUsers: users.length,
        activeToday: activeToday.length,
        totalApplications: applications.length,
        totalDocuments: documents.length,
        totalUniversities: universities.length,
        totalScholarships: scholarships.length,
        pendingKyc: kycSnap.size,
      },
      roleDistribution: Object.entries(roleCounts).map(([role, count]) => ({ role, count })),
      applicationStages: Object.entries(stageCounts).map(([status, count]) => ({ status, count })),
      documentCategories: Object.entries(docsByType).map(([type, count]) => ({ type, count })),
      monthlySignups: Object.entries(monthlySignups).map(([month, count]) => ({ month, count })),
      monthlyApplications: Object.entries(monthlyApplications).map(([month, count]) => ({ month, count })),
      recentAuditLogs: audits,
    });
  } catch (error) {
    console.error('Admin dashboard error:', error);
    res.status(500).json({ error: 'Failed to fetch admin dashboard data' });
  }
});

module.exports = router;
