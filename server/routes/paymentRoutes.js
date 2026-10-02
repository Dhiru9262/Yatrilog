const express = require("express");

const {
  createOrder,
  verifyPayment,
} = require("../controllers/paymentController");

const { cancelBooking } = require("../controllers/customerBookingController");

const protect = require("../middleware/authMiddleware");
const allowRoles = require("../middleware/roleMiddleware");

const router = express.Router();

// ======================================
// CREATE RAZORPAY ORDER
// ======================================

router.post("/order", protect, allowRoles("CUSTOMER"), createOrder);

// ======================================
// VERIFY PAYMENT
// ======================================

router.post("/verify", protect, allowRoles("CUSTOMER"), verifyPayment);

// ======================================
// CANCEL BOOKING + REFUND
// ======================================
//
// Important:
// bookingId is the individual seat booking ID.
//
// If a payment contains:
//   Seat 5 -> Booking A
//   Seat 6 -> Booking B
//
// cancelling Booking A refunds only Seat 5.
// Booking B remains confirmed.
//

router.post(
  "/cancel/:bookingId",
  protect,
  allowRoles("CUSTOMER"),
  cancelBooking,
);

module.exports = router;
