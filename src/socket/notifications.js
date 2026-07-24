const { collections, getDocs, addDoc, setDoc, getDoc, serverTimestamp } = require('../utils/firestore');

module.exports = (io, socket) => {
  socket.on('notifications:get', async ({ userId }) => {
    try {
      const notifs = await getDocs(
        collections.notifications,
        [{ field: 'userId', op: '==', value: userId }],
        { field: 'createdAt', direction: 'desc' },
        50
      );
      socket.emit('notifications:list', { notifications: notifs });
    } catch (err) {
      socket.emit('notifications:error', { error: 'Failed to load notifications' });
    }
  });

  socket.on('notifications:mark-read', async ({ notificationId }) => {
    try {
      await setDoc(collections.notifications, notificationId, { read: true });
      socket.emit('notifications:updated', { id: notificationId, read: true });
    } catch (err) {}
  });

  socket.on('notifications:mark-all-read', async ({ userId }) => {
    try {
      const unread = await getDocs(collections.notifications, [
        { field: 'userId', op: '==', value: userId },
        { field: 'read', op: '==', value: false },
      ]);
      for (const n of unread) {
        await setDoc(collections.notifications, n.id, { read: true });
      }
      socket.emit('notifications:all-read');
    } catch (err) {}
  });
};

async function createNotification(userId, type, title, body, data = {}) {
  try {
    await addDoc(collections.notifications, {
      userId, type, title, body, data, read: false, createdAt: serverTimestamp(),
    });
  } catch (err) {
    console.error('Failed to create notification:', err);
  }
}

module.exports.createNotification = createNotification;
