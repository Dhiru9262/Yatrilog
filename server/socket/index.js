const { Server } = require("socket.io");

let io;

const initializeSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL,
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  io.on("connection", (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    // ======================================
    // JOIN TRIP ROOM
    // ======================================

    socket.on("joinTrip", (tripId) => {
      if (!tripId) {
        return;
      }

      const room = `trip:${tripId}`;

      socket.join(room);

      console.log(`Socket ${socket.id} joined ${room}`);
    });

    // ======================================
    // LEAVE TRIP ROOM
    // ======================================

    socket.on("leaveTrip", (tripId) => {
      if (!tripId) {
        return;
      }

      const room = `trip:${tripId}`;

      socket.leave(room);

      console.log(`Socket ${socket.id} left ${room}`);
    });

    // ======================================
    // DISCONNECT
    // ======================================

    socket.on("disconnect", () => {
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });

  return io;
};

// ======================================
// GET SOCKET INSTANCE
// ======================================

const getIO = () => {
  if (!io) {
    throw new Error("Socket.IO has not been initialized");
  }

  return io;
};

module.exports = {
  initializeSocket,
  getIO,
};
