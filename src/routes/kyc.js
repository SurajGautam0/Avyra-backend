const { Router } = require('express');
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const upload = require('../middleware/upload');
const { db, collections, getDocs, setDoc, addDoc, queryOne, serverTimestamp } = require('../utils/firestore');

const router = Router();

// GET /api/kyc/status
router.get('/status', authenticate, async (req, res) => {
  try {
    const docs = await getDocs(collections.kycDocuments, [
      { field: 'userId', op: '==', value: req.user.id },
    ]);
    res.json({ overallStatus: req.user.kycStatus || 'not-started', documents: docs, step: 3, totalSteps: 4 });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch KYC status' });
  }
});

// POST /api/kyc/upload
router.post('/upload', authenticate, upload.single('file'), [
  body('documentType').isIn(['passport', 'national-id', 'citizenship-certificate', 'selfie-photo']),
  validate,
], async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const existing = await queryOne(collections.kycDocuments, 'userId', '==', req.user.id);

    const data = {
      userId: req.user.id,
      documentType: req.body.documentType,
      status: 'uploaded',
      fileUrl: `/uploads/${req.file.filename}`,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      ocrData: { confidence: Math.floor(Math.random() * 20) + 75, processedAt: new Date().toISOString() },
      uploadedAt: serverTimestamp(),
    };

    let doc;
    if (existing) {
      await setDoc(collections.kycDocuments, existing.id, data);
      doc = { id: existing.id, ...data };
    } else {
      doc = await addDoc(collections.kycDocuments, data);
    }

    const allDocs = await getDocs(collections.kycDocuments, [{ field: 'userId', op: '==', value: req.user.id }]);
    const allUploaded = allDocs.length >= 4 && allDocs.every((d) => d.status === 'uploaded' || d.status === 'verified');
    await setDoc(collections.users, req.user.id, { kycStatus: allUploaded ? 'pending' : 'not-started' });

    res.json({ document: doc, overallStatus: allUploaded ? 'pending' : 'not-started' });
  } catch (error) {
    res.status(500).json({ error: 'Upload failed' });
  }
});

// POST /api/kyc/submit
router.post('/submit', authenticate, async (req, res) => {
  try {
    const docs = await getDocs(collections.kycDocuments, [{ field: 'userId', op: '==', value: req.user.id }]);
    if (docs.length < 4 || !docs.every((d) => d.status === 'uploaded')) {
      return res.status(400).json({ error: 'Upload all 4 documents before submitting' });
    }
    await setDoc(collections.users, req.user.id, { kycStatus: 'pending' });
    res.json({ message: 'KYC submitted for verification' });
  } catch (error) {
    res.status(500).json({ error: 'Submission failed' });
  }
});

module.exports = router;
