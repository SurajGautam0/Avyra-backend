module.exports = (io, socket) => {
  socket.on('video:call-initiate', ({ roomId, receiverId, callerName, callerId, conversationId }) => {
    io.to(`user:${receiverId}`).emit('video:incoming-call', {
      roomId, callerName, callerId, conversationId,
    });
  });

  socket.on('video:call-accept', ({ roomId, callerId }) => {
    io.to(`user:${callerId}`).emit('video:call-accepted', { roomId });
  });

  socket.on('video:call-reject', ({ callerId, callerName }) => {
    io.to(`user:${callerId}`).emit('video:call-rejected', { callerName });
  });

  socket.on('video:call-end', ({ receiverId }) => {
    if (receiverId) io.to(`user:${receiverId}`).emit('video:call-ended', {});
  });
};
