const express = require("express");

const {
  getMyTrips,
  getTripPassengers,
  createOfflineBooking,
  cancelDriverBooking,
} = require("../controllers/driverBookingController");

const protect = require("../middleware/authMiddleware");

const allowRoles = require("../middleware/roleMiddleware");

const router = express.Router();

// ======================================
// ASSIGNED TRIPS
// ======================================

router.get("/trips", protect, allowRoles("AGENT"), getMyTrips);

// ======================================
// PASSENGERS
// ======================================

router.get(
  "/trips/:tripId/passengers",
  protect,
  allowRoles("AGENT"),
  getTripPassengers,
);

// ======================================
// CREATE OFFLINE BOOKING
// ======================================

router.post(
  "/trips/:tripId/bookings",
  protect,
  allowRoles("AGENT", "OWNER"),
  createOfflineBooking,
);

// ======================================
// CANCEL DRIVER'S OWN BOOKING
// ======================================

router.delete(
  "/bookings/:bookingId",
  protect,
  allowRoles("AGENT", "OWNER"),
  cancelDriverBooking,
);

module.exports = router;
