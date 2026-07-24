const { Router } = require('express');
const { authenticate } = require('../middleware/auth');
const upload = require('../middleware/upload');
const { collections, getDocs, getDoc, addDoc, deleteDoc, serverTimestamp } = require('../utils/firestore');

const router = Router();

// GET /api/documents
router.get('/', authenticate, async (req, res) => {
  try {
    const docs = await getDocs(collections.documents, [
      { field: 'userId', op: '==', value: req.user.id },
    ], { field: 'createdAt', direction: 'desc' });

    const categories = ['identity', 'academic', 'application', 'visa', 'other'].map((name) => ({
      name,
      documents: docs.filter((d) => d.category === name),
    }));

    res.json({
      categories,
      total: docs.length,
      uploaded: docs.filter((d) => d.status !== 'pending').length,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch documents' });
  }
});

// POST /api/documents/upload
router.post('/upload', authenticate, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file' });

    const doc = await addDoc(collections.documents, {
      userId: req.user.id,
      category: req.body.category || 'other',
      type: req.body.type || 'other',
      name: req.file.originalname,
      fileUrl: `/uploads/${req.file.filename}`,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      status: 'uploaded',
      createdAt: serverTimestamp(),
    });

    res.status(201).json({ document: doc });
  } catch (error) {
    res.status(500).json({ error: 'Upload failed' });
  }
});

// DELETE /api/documents/:id
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const doc = await getDoc(collections.documents, req.params.id);
    if (!doc || doc.userId !== req.user.id) return res.status(404).json({ error: 'Document not found' });
    await deleteDoc(collections.documents, req.params.id);
    res.json({ message: 'Document deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Delete failed' });
  }
});

module.exports = router;
