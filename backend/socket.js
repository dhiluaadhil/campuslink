let io;

const init = (server) => {
  const { Server } = require('socket.io');
  io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL,
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket) => {
    // Client emits 'join' with their userId to subscribe to personal notifications
    socket.on('join', (userId) => {
      socket.join(`user:${userId}`);
      console.log(`Socket joined room user:${userId}`);
    });

    socket.on('disconnect', () => {
      console.log('Socket disconnected:', socket.id);
    });
  });

  return io;
};

const getIO = () => {
  if (!io) throw new Error('Socket.io not initialized');
  return io;
};

/**
 * Emit a notification to a specific user's room.
 * @param {string} recipientId - UUID of recipient
 * @param {object} notification - Notification payload
 */
const emitNotification = (recipientId, notification) => {
  getIO().to(`user:${recipientId}`).emit('notification', notification);
};

module.exports = { init, getIO, emitNotification };
