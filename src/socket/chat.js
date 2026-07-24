const { collections, addDoc, getDocs, getDoc, serverTimestamp } = require('../utils/firestore');

module.exports = (io, socket) => {
  socket.on('chat:join', ({ userId, conversationId }) => {
    if (conversationId) socket.join(`chat:${conversationId}`);
    socket.join(`user:${userId}`);
  });

  socket.on('chat:send', async ({ conversationId, text, senderId, senderName, receiverId }) => {
    try {
      const message = {
        conversationId,
        text,
        senderId,
        senderName,
        receiverId,
        read: false,
        createdAt: serverTimestamp(),
      };
      const saved = await addDoc(collections.messages, message);

      const out = { id: saved.id, ...message, createdAt: new Date().toISOString() };

      io.to(`chat:${conversationId}`).emit('chat:message', out);
      io.to(`user:${receiverId}`).emit('notification:new', {
        type: 'chat',
        title: senderName,
        body: text,
        data: { conversationId, messageId: saved.id },
      });

      const convSnap = await getDoc(collections.conversations, conversationId);
      if (convSnap) {
        const { setDoc } = require('../utils/firestore');
        await setDoc(collections.conversations, conversationId, {
          lastMessage: text,
          lastMessageAt: serverTimestamp(),
          lastSenderId: senderId,
        });
      }
    } catch (err) {
      socket.emit('chat:error', { error: 'Failed to send message' });
    }
  });

  socket.on('chat:history', async ({ conversationId, page = 1, limit = 50 }) => {
    try {
      const messages = await getDocs(
        collections.messages,
        [{ field: 'conversationId', op: '==', value: conversationId }],
        { field: 'createdAt', direction: 'desc' },
        parseInt(limit)
      );
      socket.emit('chat:history', { messages: messages.reverse(), page: parseInt(page) });
    } catch (err) {
      socket.emit('chat:error', { error: 'Failed to load history' });
    }
  });

  socket.on('chat:mark-read', async ({ conversationId, userId }) => {
    try {
      const msgs = await getDocs(collections.messages, [
        { field: 'conversationId', op: '==', value: conversationId },
        { field: 'receiverId', op: '==', value: userId },
        { field: 'read', op: '==', value: false },
      ]);
      for (const m of msgs) {
        const { setDoc } = require('../utils/firestore');
        await setDoc(collections.messages, m.id, { read: true });
      }
      io.to(`chat:${conversationId}`).emit('chat:read', { conversationId, userId });
    } catch (err) {}
  });

  socket.on('chat:conversations', async ({ userId }) => {
    try {
      const convs = await getDocs(collections.conversations, [
        { field: 'participants', op: 'array-contains', value: userId },
      ], { field: 'lastMessageAt', direction: 'desc' });

      const enriched = await Promise.all(convs.map(async (c) => {
        const otherId = (c.participants || []).find((p) => p !== userId);
        const otherUser = otherId ? await getDoc(collections.users, otherId) : null;
        const unread = await getDocs(collections.messages, [
          { field: 'conversationId', op: '==', value: c.id },
          { field: 'receiverId', op: '==', value: userId },
          { field: 'read', op: '==', value: false },
        ]);
        return {
          ...c,
          otherUser: otherUser ? { id: otherUser.id, displayName: otherUser.displayName, email: otherUser.email, role: otherUser.role, photoUrl: otherUser.photoUrl } : null,
          unreadCount: unread.length,
        };
      }));

      socket.emit('chat:conversations', { conversations: enriched });
    } catch (err) {
      socket.emit('chat:error', { error: 'Failed to load conversations' });
    }
  });
};
