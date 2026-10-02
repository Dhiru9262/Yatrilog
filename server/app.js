const dotenv = require("dotenv");
dotenv.config();
const express = require("express");
const cors = require("cors");
const authRoutes = require("./routes/authRoutes");
const adminRoutes = require("./routes/adminRoutes");
const vehicleRoutes = require("./routes/vehicleRoutes");
const routeRoutes = require("./routes/routeRoutes");
const tripRoutes = require("./routes/tripRoutes");
const fareRoutes = require("./routes/fareRoutes");
const customerRoutes = require("./routes/customerRoutes");
const bookingRoutes = require("./routes/bookingRoutes");
const seatLockRoutes = require("./routes/seatLockRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const dailyBookingRoutes = require("./routes/dailyBookingRoutes");
const customerBookingRoutes = require("./routes/customerBookingRoutes");
const driverRoutes = require("./routes/driverRoutes");
const { razorpayWebhook } = require("./controllers/razorpayWebhookController");
const userRoutes = require("./routes/userRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const revenueRoutes = require("./routes/revenueRoutes");
const vehicleBookingRoutes = require("./routes/vehicleBookingRoutes");

const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const errorHandler = require("./middleware/errorMiddleware");

const app = express();
app.use(helmet());

// Middlewares
const allowedOrigins = (process.env.CLIENT_URL || "http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests without an Origin header
      // such as Postman/server-to-server requests.
      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error("Not allowed by CORS"));
    },

    credentials: true,
  }),
);

// ======================================
// RAZORPAY WEBHOOK
// MUST COME BEFORE express.json()
// ======================================

app.post(
  "/api/payments/webhook",
  express.raw({
    type: "application/json",
  }),
  razorpayWebhook,
);

app.use(
  express.json({
    limit: "1mb",
  }),
);

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,

  max: 300,

  standardHeaders: true,

  legacyHeaders: false,

  message: {
    success: false,
    message: "Too many requests. Please try again later.",
  },
});

app.use("/api", apiLimiter);

// routes
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/vehicles", vehicleRoutes);
app.use("/api/vehicles", vehicleBookingRoutes);
app.use("/api/routes", routeRoutes);
app.use("/api/trips", tripRoutes);
app.use("/api/fares", fareRoutes);
app.use("/api/customer", customerRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/seat-locks", seatLockRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/customer/bookings", customerBookingRoutes);
app.use("/api/driver", driverRoutes);
app.use("/api/users", userRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/daily-bookings", dailyBookingRoutes);
app.use("/api/revenue", revenueRoutes);

// Test route
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Public Transport API is running",
  });
});

app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    status: "healthy",
    timestamp: new Date().toISOString(),
  });
});

app.use(errorHandler);

module.exports = app;
