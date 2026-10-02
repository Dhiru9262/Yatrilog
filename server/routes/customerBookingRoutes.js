const express = require("express");

const {
  getMyBookings,
  getMyBooking,
  cancelBooking,
} = require("../controllers/customerBookingController");

const protect = require("../middleware/authMiddleware");
const allowRoles = require("../middleware/roleMiddleware");

const router = express.Router();

// ======================================
// MY BOOKINGS
// ======================================

router.get("/", protect, allowRoles("CUSTOMER"), getMyBookings);

// ======================================
// SINGLE / GROUPED TICKET
// ======================================

router.get("/:bookingId", protect, allowRoles("CUSTOMER"), getMyBooking);

// ======================================
// CANCEL ENTIRE TICKET
// ======================================

router.post(
  "/:bookingId/cancel",
  protect,
  allowRoles("CUSTOMER"),
  cancelBooking,
);

module.exports = router;
