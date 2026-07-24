const { Router } = require('express');
const { body } = require('express-validator');
const validate = require('../../middleware/validate');
const { authenticate, authorize } = require('../../middleware/auth');
const { collections, getDocs, getDoc, addDoc, setDoc, deleteDoc, serverTimestamp } = require('../../utils/firestore');

const router = Router();

router.get('/', authenticate, authorize('consultant', 'admin'), async (req, res) => {
  try {
    const filters = [{ field: 'consultantId', op: '==', value: req.user.id }];
    if (req.query.studentId) filters.push({ field: 'studentId', op: '==', value: req.query.studentId });

    let notes = await getDocs(collections.consultantNotes, filters, { field: 'createdAt', direction: 'desc' });

    if (req.query.pinned) notes = notes.filter((n) => n.isPinned);

    const enriched = await Promise.all(notes.map(async (n) => {
      if (n.studentId) {
        const user = await getDoc(collections.users, n.studentId);
        return { ...n, student: user ? { id: user.id, displayName: user.displayName, email: user.email } : null };
      }
      return n;
    }));

    res.json({ notes: enriched });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch notes' });
  }
});

router.post('/', authenticate, authorize('consultant', 'admin'), [
  body('content').trim().notEmpty(),
  body('studentId').optional().isString(),
  body('type').optional().isIn(['general', 'pinned', 'memo', 'action-item']),
  validate,
], async (req, res) => {
  try {
    const note = await addDoc(collections.consultantNotes, {
      consultantId: req.user.id,
      studentId: req.body.studentId || null,
      content: req.body.content,
      type: req.body.type || 'general',
      tags: req.body.tags || [],
      isPinned: req.body.isPinned || false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    res.status(201).json({ note });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create note' });
  }
});

router.put('/:id/toggle-pin', authenticate, authorize('consultant', 'admin'), async (req, res) => {
  try {
    const note = await getDoc(collections.consultantNotes, req.params.id);
    if (!note || note.consultantId !== req.user.id) return res.status(404).json({ error: 'Note not found' });
    await setDoc(collections.consultantNotes, req.params.id, { isPinned: !note.isPinned });
    const updated = await getDoc(collections.consultantNotes, req.params.id);
    res.json({ note: updated });
  } catch (error) {
    res.status(500).json({ error: 'Failed to toggle pin' });
  }
});

router.delete('/:id', authenticate, authorize('consultant', 'admin'), async (req, res) => {
  try {
    await deleteDoc(collections.consultantNotes, req.params.id);
    res.json({ message: 'Note deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete note' });
  }
});

module.exports = router;
