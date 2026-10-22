const { Server } = require('socket.io');

let ioInstance = null;

function initSocket(httpServer, frontendOrigin) {
  ioInstance = new Server(httpServer, {
    cors: {
      origin: frontendOrigin || '*',
      methods: ['GET', 'POST'],
    },
  });

  ioInstance.on('connection', (socket) => {
    console.log(`[socket] client connected: ${socket.id}`);

    socket.on('disconnect', () => {
      console.log(`[socket] client disconnected: ${socket.id}`);
    });
  });

  return ioInstance;
}

/**
 * Emits a new measurement to all connected clients.
 * Safe to call even if socket.io hasn't been initialized (e.g. in tests).
 */
function emitAqiUpdate(measurement) {
  if (!ioInstance) return;
  ioInstance.emit('aqiUpdated', measurement);
}

function getIO() {
  return ioInstance;
}

module.exports = { initSocket, emitAqiUpdate, getIO };
