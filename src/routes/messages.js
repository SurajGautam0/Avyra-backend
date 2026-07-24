const { Router } = require('express');
const { authenticate } = require('../middleware/auth');
const { collections, getDocs, addDoc, getDoc, setDoc, serverTimestamp } = require('../utils/firestore');

const router = Router();

router.get('/conversations', authenticate, async (req, res) => {
  try {
    const convs = await getDocs(collections.conversations, [
      { field: 'participants', op: 'array-contains', value: req.user.id },
    ], { field: 'lastMessageAt', direction: 'desc' });

    const enriched = await Promise.all(convs.map(async (c) => {
      const otherId = (c.participants || []).find((p) => p !== req.user.id);
      const otherUser = otherId ? await getDoc(collections.users, otherId) : null;
      const unreadMsgs = await getDocs(collections.messages, [
        { field: 'conversationId', op: '==', value: c.id },
        { field: 'receiverId', op: '==', value: req.user.id },
        { field: 'read', op: '==', value: false },
      ]);
      return {
        ...c,
        otherUser: otherUser ? { id: otherUser.id, displayName: otherUser.displayName, email: otherUser.email, role: otherUser.role, photoUrl: otherUser.photoUrl } : null,
        unreadCount: unreadMsgs.length,
      };
    }));

    res.json({ conversations: enriched });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
});

router.get('/conversations/:id', authenticate, async (req, res) => {
  try {
    const messages = await getDocs(collections.messages, [
      { field: 'conversationId', op: '==', value: req.params.id },
    ], { field: 'createdAt', direction: 'asc' });

    res.json({ messages });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

router.post('/conversations', authenticate, async (req, res) => {
  try {
    const { receiverId, text } = req.body;
    if (!receiverId) return res.status(400).json({ error: 'receiverId required' });

    const existing = await getDocs(collections.conversations, [
      { field: 'participants', op: 'array-contains', value: req.user.id },
    ]);

    const existingConv = existing.find((c) =>
      (c.participants || []).includes(receiverId)
    );

    if (existingConv) {
      if (text) {
        const msg = await addDoc(collections.messages, {
          conversationId: existingConv.id,
          text, senderId: req.user.id, senderName: req.user.displayName || 'User',
          receiverId, read: false, createdAt: serverTimestamp(),
        });
        await setDoc(collections.conversations, existingConv.id, {
          lastMessage: text, lastMessageAt: serverTimestamp(), lastSenderId: req.user.id,
        });
        res.json({ conversation: existingConv, message: { id: msg.id, ...msg } });
      } else {
        res.json({ conversation: existingConv });
      }
    } else {
      const conv = await addDoc(collections.conversations, {
        participants: [req.user.id, receiverId],
        lastMessage: text || '',
        lastMessageAt: serverTimestamp(),
        createdBy: req.user.id,
        createdAt: serverTimestamp(),
      });

      if (text) {
        const msg = await addDoc(collections.messages, {
          conversationId: conv.id, text, senderId: req.user.id,
          senderName: req.user.displayName || 'User',
          receiverId, read: false, createdAt: serverTimestamp(),
        });
        res.status(201).json({ conversation: conv, message: { id: msg.id, ...msg } });
      } else {
        res.status(201).json({ conversation: conv });
      }
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to create conversation' });
  }
});

module.exports = router;
