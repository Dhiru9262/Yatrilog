const http = require("http");

const app = require("./app");

const connectDB = require("./config/db.js");

const { initializeSocket } = require("./socket");

const { releaseExpiredSeatLocks } = require("./services/seatLockService");

const { startPaymentCleanupJob } = require("./jobs/paymentCleanupJob");

const { validateEnv } = require("./config/env");
const mongoose = require("mongoose");

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  validateEnv();

  await connectDB();

  const httpServer = http.createServer(app);

  initializeSocket(httpServer);

  // ======================================
  // PAYMENT CLEANUP JOB
  // ======================================

  const paymentCleanupInterval = startPaymentCleanupJob();

  // ======================================
  // EXPIRED SEAT LOCK CHECKER
  // ======================================

  const seatLockInterval = setInterval(releaseExpiredSeatLocks, 5000);

  // ======================================
  // START HTTP SERVER
  // ======================================

  httpServer.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Socket.IO running on port ${PORT}`);
  });

  // ======================================
  // GRACEFUL SHUTDOWN
  // ======================================

  const shutdown = async (signal) => {
    console.log(`${signal} received. Shutting down...`);

    clearInterval(seatLockInterval);
    clearInterval(paymentCleanupInterval);

    httpServer.close(async () => {
      console.log("HTTP server closed");

      try {
        await mongoose.connection.close();

        console.log("MongoDB connection closed");

        process.exit(0);
      } catch (error) {
        console.error("Error closing MongoDB connection:", error);

        process.exit(1);
      }
    });
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));

  process.on("SIGINT", () => shutdown("SIGINT"));
};

startServer();
