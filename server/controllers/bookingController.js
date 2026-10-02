const { getFareForTrip } = require("../services/routeFareService");
const Booking = require("../models/Booking");
const Trip = require("../models/Trip");
const Fare = require("../models/Fare");
const Payment = require("../models/Payment");
const { createNotification } = require("../services/notificationService");

const { createRefund } = require("../services/paymentService");
const { isSeatAvailable } = require("../services/seatService");
const { emitSeatUpdate } = require("../socket/seatSocket");

// ======================================
// CREATE BOOKING
// ======================================

const createBooking = async (req, res) => {
  try {
    const { tripId, boardingStop, droppingStop, seatNumber } = req.body;

    // -----------------------------
    // Validate input
    // -----------------------------

    if (!tripId || !boardingStop || !droppingStop || !seatNumber) {
      return res.status(400).json({
        success: false,
        message:
          "tripId, boardingStop, droppingStop and seatNumber are required",
      });
    }

    // -----------------------------
    // Get trip
    // -----------------------------

    const trip = await Trip.findById(tripId)
      .populate("route")
      .populate("vehicle");

    if (!trip) {
      return res.status(404).json({
        success: false,
        message: "Trip not found",
      });
    }

    // Only scheduled trips can be booked
    if (trip.status !== "SCHEDULED") {
      return res.status(400).json({
        success: false,
        message: "This trip is not available for booking",
      });
    }

    // -----------------------------
    // Find stops
    // -----------------------------

    const fromStop = trip.route.stops.find(
      (stop) => stop._id.toString() === boardingStop.toString(),
    );

    const toStop = trip.route.stops.find(
      (stop) => stop._id.toString() === droppingStop.toString(),
    );

    if (!fromStop || !toStop) {
      return res.status(400).json({
        success: false,
        message: "Invalid boarding or dropping stop",
      });
    }

    // -----------------------------
    // Validate direction
    // -----------------------------

    if (fromStop.sequence >= toStop.sequence) {
      return res.status(400).json({
        success: false,
        message: "Boarding stop must come before dropping stop",
      });
    }

    // -----------------------------
    // Check seat number
    // -----------------------------

    const totalSeats = trip.vehicle.totalSeats;

    const requestedSeat = Number(seatNumber);

    if (
      !Number.isInteger(requestedSeat) ||
      requestedSeat < 1 ||
      requestedSeat > totalSeats
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid seat number",
      });
    }

    // -----------------------------
    // Get exact fare
    // -----------------------------

    const fare = await getFareForTrip(tripId, fromStop._id, toStop._id);

    if (!fare) {
      return res.status(400).json({
        success: false,
        message: "Fare is not configured for this journey",
      });
    }

    // -----------------------------
    // Check seat availability
    // -----------------------------

    const available = await isSeatAvailable(
      tripId,
      String(seatNumber),
      fromStop.sequence,
      toStop.sequence,
    );

    if (!available) {
      return res.status(409).json({
        success: false,
        message: "Selected seat is not available for this journey segment",
      });
    }

    // -----------------------------
    // Create booking
    // -----------------------------

    const booking = await Booking.create({
      customer: req.user.id,

      trip: tripId,

      seatNumber: String(seatNumber),

      boardingStop: fromStop._id,

      droppingStop: toStop._id,

      boardingSequence: fromStop.sequence,

      droppingSequence: toStop.sequence,

      fare: fare.amount,

      status: "PENDING",

      paymentStatus: "PENDING",

      bookingType: "ONLINE",
    });

    const populatedBooking = await Booking.findById(booking._id)
      .populate("customer", "name email phone")
      .populate("trip");

    res.status(201).json({
      success: true,
      message: "Booking created successfully",
      booking: populatedBooking,
    });
  } catch (error) {
    console.error("Create booking error:", error);

    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// ==========================================
// CANCEL BOOKING
// ==========================================

const cancelBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;

    // ==================================
    // FIND CUSTOMER BOOKING
    // ==================================

    const booking = await Booking.findOne({
      _id: bookingId,
      customer: req.user.id,
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    // ==================================
    // CHECK BOOKING STATUS
    // ==================================

    if (booking.status !== "CONFIRMED") {
      return res.status(400).json({
        success: false,
        message: "Only confirmed bookings can be cancelled",
      });
    }

    // ==================================
    // FIND TRIP
    // ==================================

    const trip = await Trip.findById(booking.trip);

    if (!trip) {
      return res.status(404).json({
        success: false,
        message: "Trip not found",
      });
    }

    // ==================================
    // CHECK DEPARTURE TIME
    // ==================================

    const departureDateTime = new Date(trip.date);

    /*
     * Your trip.date should represent
     * the trip date.
     *
     * We add departureTime such as:
     * "10:00"
     */

    if (trip.departureTime) {
      const [hours, minutes] = trip.departureTime.split(":").map(Number);

      departureDateTime.setHours(hours, minutes, 0, 0);
    }

    const cutoffMinutes = Number(process.env.CANCELLATION_CUTOFF_MINUTES) || 60;

    const cutoffTime = new Date(
      departureDateTime.getTime() - cutoffMinutes * 60 * 1000,
    );

    const now = new Date();

    if (now >= cutoffTime) {
      return res.status(400).json({
        success: false,
        message: `Cancellation is allowed only ${cutoffMinutes} minutes before departure`,
      });
    }

    // ==================================
    // FIND PAYMENT
    // ==================================

    const payment = await Payment.findOne({
      booking: booking._id,
    });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment record not found",
      });
    }

    // ==================================
    // PAYMENT MUST BE PAID
    // ==================================

    if (payment.status !== "PAID") {
      return res.status(400).json({
        success: false,
        message: "Paid payment record not found",
      });
    }

    if (!payment.razorpayPaymentId) {
      return res.status(400).json({
        success: false,
        message: "Razorpay payment ID is missing",
      });
    }

    // ==================================
    // CREATE RAZORPAY REFUND
    // ==================================

    const refund = await createRefund({
      razorpayPaymentId: payment.razorpayPaymentId,

      amount: payment.amount,

      receipt: booking.bookingNumber,
    });

    // ==================================
    // UPDATE PAYMENT
    // ==================================

    payment.status = "REFUNDED";

    payment.refundId = refund.id;

    payment.refundedAmount = payment.amount;

    payment.refundedAt = new Date();

    await payment.save();

    // ==================================
    // UPDATE BOOKING
    // ==================================

    booking.status = "CANCELLED";

    booking.paymentStatus = "REFUNDED";

    await booking.save();

    await createNotification({
      user: booking.customer,
      type: "PAYMENT_SUCCESS",
      title: "Payment successful",
      message: `Your payment for booking ${booking.bookingNumber} was successful.`,
      booking: booking._id,
      trip: booking.trip,
    });

    await createNotification({
      user: booking.customer,
      type: "BOOKING_CONFIRMED",
      title: "Booking confirmed",
      message: `Your booking ${booking.bookingNumber} has been confirmed.`,
      booking: booking._id,
      trip: booking.trip,
    });

    await createNotification({
      user: booking.customer,
      type: "TICKET_GENERATED",
      title: "Ticket generated",
      message: `Your ticket for booking ${booking.bookingNumber} is ready.`,
      booking: booking._id,
      trip: booking.trip,
    });

    emitSeatUpdate({
      tripId: booking.trip,

      seatNumber: booking.seatNumber,

      status: "AVAILABLE",

      boardingSequence: booking.boardingSequence,

      droppingSequence: booking.droppingSequence,
    });
    return res.status(200).json({
      success: true,

      message: "Booking cancelled and refund initiated",

      booking: {
        id: booking._id,
        bookingNumber: booking.bookingNumber,
        status: booking.status,
        paymentStatus: booking.paymentStatus,
      },

      refund: {
        id: refund.id,
        amount: payment.amount,
        status: refund.status,
      },
    });
  } catch (error) {
    console.error("Cancel booking error:", error);

    return res.status(500).json({
      success: false,
      message:
        error?.error?.description ||
        error.message ||
        "Unable to cancel booking",
    });
  }
};

module.exports = {
  createBooking,
  cancelBooking,
};
