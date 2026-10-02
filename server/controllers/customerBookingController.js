const mongoose = require("mongoose");

const Booking = require("../models/Booking");
const Payment = require("../models/Payment");

const { createRefund } = require("../services/paymentService");
const { timeToMinutes } = require("../utils/timeUtils");

// ======================================
// FORMAT SINGLE BOOKING
// ======================================

const formatBooking = (booking) => {
  const trip = booking.trip;

  if (!trip || !trip.route) {
    return {
      id: booking._id,
      bookingNumber: booking.bookingNumber,
      status: booking.status,
      paymentStatus: booking.paymentStatus,
      seatNumber: booking.seatNumber,
      fare: booking.fare,
      bookingType: booking.bookingType,
      cancelledAt: booking.cancelledAt,
      refundId: booking.refundId,
      refundedAmount: booking.refundedAmount || 0,
    };
  }

  const boardingStop = trip.route.stops.find(
    (stop) => stop._id.toString() === booking.boardingStop.toString(),
  );

  const droppingStop = trip.route.stops.find(
    (stop) => stop._id.toString() === booking.droppingStop.toString(),
  );

  return {
    id: booking._id,

    bookingNumber: booking.bookingNumber,

    status: booking.status,

    paymentStatus: booking.paymentStatus,

    seatNumber: booking.seatNumber,

    fare: booking.fare,

    bookingType: booking.bookingType,

    cancelledAt: booking.cancelledAt || null,

    refundId: booking.refundId || null,

    refundedAmount: booking.refundedAmount || 0,

    trip: {
      id: trip._id,

      date: trip.date,

      departureTime: trip.departureTime,

      arrivalTime: trip.arrivalTime,
    },

    route: {
      id: trip.route._id,

      name: trip.route.name,
    },

    boardingStop: boardingStop ? boardingStop.name : null,

    droppingStop: droppingStop ? droppingStop.name : null,

    driver:
      booking.status === "CONFIRMED" && trip.driver
        ? {
            name: trip.driver.name,

            phone: trip.driver.phone,

            email: trip.driver.email,
          }
        : null,

    vehicle: trip.vehicle
      ? {
          vehicleNumber: trip.vehicle.vehicleNumber,

          type: trip.vehicle.type,
        }
      : null,
  };
};

// ======================================
// GET MY BOOKINGS
// ======================================
//
// IMPORTANT:
//
// If one payment contains:
//
// Seat 5 -> Booking A
// Seat 6 -> Booking B
//
// My Bookings returns ONE ticket.
//
// ======================================

const getMyBookings = async (req, res) => {
  try {
    const customerId = req.user.id;

    // ----------------------------------
    // Get customer's bookings
    // ----------------------------------

    const bookings = await Booking.find({
      customer: customerId,
    })
      .populate({
        path: "trip",

        populate: [
          {
            path: "route",
          },
          {
            path: "vehicle",
          },
          {
            path: "driver",
            select: "name phone email",
          },
        ],
      })
      .sort({
        createdAt: -1,
        _id: -1,
      });

    if (bookings.length === 0) {
      return res.status(200).json({
        success: true,
        count: 0,
        bookings: [],
      });
    }

    // ----------------------------------
    // Find payments containing bookings
    // ----------------------------------

    const bookingIds = bookings.map((booking) => booking._id);

    const payments = await Payment.find({
      customer: customerId,

      bookings: {
        $in: bookingIds,
      },
    });

    // ----------------------------------
    // Map booking -> payment
    // ----------------------------------

    const paymentMap = new Map();

    for (const payment of payments) {
      if (!Array.isArray(payment.bookings)) {
        continue;
      }

      for (const bookingId of payment.bookings) {
        paymentMap.set(bookingId.toString(), payment);
      }
    }

    // ----------------------------------
    // Prevent duplicate ticket cards
    // ----------------------------------

    const processedPayments = new Set();

    const result = [];

    for (const booking of bookings) {
      const payment = paymentMap.get(booking._id.toString());

      // ==================================
      // OLD / SINGLE BOOKING
      // ==================================

      if (
        !payment ||
        !Array.isArray(payment.bookings) ||
        payment.bookings.length === 0
      ) {
        const formatted = formatBooking(booking);

        result.push({
          id: formatted.id,

          bookingNumber: formatted.bookingNumber,

          status: formatted.status,

          paymentStatus: formatted.paymentStatus,

          bookingType: formatted.bookingType,

          bookings: [formatted],

          seats: [
            {
              seatNumber: formatted.seatNumber,

              fare: formatted.fare,

              bookingId: formatted.id,

              bookingNumber: formatted.bookingNumber,

              status: formatted.status,

              refundedAmount: formatted.refundedAmount || 0,
            },
          ],

          totalSeats: 1,

          totalFare: Number(formatted.fare || 0),

          activeFare:
            formatted.status === "CANCELLED" ? 0 : Number(formatted.fare || 0),

          refundedAmount: Number(formatted.refundedAmount || 0),

          paymentId: null,

          trip: formatted.trip || null,

          route: formatted.route || null,

          boardingStop: formatted.boardingStop || null,

          droppingStop: formatted.droppingStop || null,

          driver: formatted.driver || null,

          vehicle: formatted.vehicle || null,

          canCancel:
            formatted.status === "CONFIRMED" &&
            formatted.paymentStatus === "PAID",
        });

        continue;
      }

      // ==================================
      // ALREADY ADDED PAYMENT
      // ==================================

      const paymentKey = payment._id.toString();

      if (processedPayments.has(paymentKey)) {
        continue;
      }

      processedPayments.add(paymentKey);

      // ==================================
      // FIND ALL BOOKINGS
      // ==================================

      const paymentBookingIdSet = new Set(
        payment.bookings.map((id) => id.toString()),
      );

      const groupedBookings = bookings.filter((item) =>
        paymentBookingIdSet.has(item._id.toString()),
      );

      // ==================================
      // FORMAT
      // ==================================

      const formattedBookings = groupedBookings.map(formatBooking);

      if (formattedBookings.length === 0) {
        continue;
      }

      // ==================================
      // SEATS
      // ==================================

      const seats = formattedBookings.map((item) => ({
        seatNumber: item.seatNumber,

        fare: Number(item.fare || 0),

        bookingId: item.id,

        bookingNumber: item.bookingNumber,

        status: item.status,

        refundedAmount: Number(item.refundedAmount || 0),
      }));

      // ==================================
      // TOTAL FARE
      // ==================================

      const totalFare = seats.reduce(
        (total, seat) => total + Number(seat.fare || 0),
        0,
      );

      // ==================================
      // ACTIVE FARE
      // ==================================

      const activeFare = seats.reduce((total, seat) => {
        if (seat.status === "CANCELLED") {
          return total;
        }

        return total + Number(seat.fare || 0);
      }, 0);

      // ==================================
      // STATUS
      // ==================================

      const activeBookings = formattedBookings.filter(
        (item) => item.status !== "CANCELLED",
      );

      let groupStatus = "CANCELLED";

      if (activeBookings.length > 0) {
        if (activeBookings.every((item) => item.status === "CONFIRMED")) {
          groupStatus = "CONFIRMED";
        } else {
          groupStatus = activeBookings[0].status;
        }
      }

      // ==================================
      // CAN CANCEL
      // ==================================

      const canCancel =
        activeBookings.length > 0 &&
        activeBookings.every(
          (item) =>
            item.status === "CONFIRMED" && item.paymentStatus === "PAID",
        );

      // ==================================
      // RESULT
      // ==================================

      result.push({
        id: formattedBookings[0].id,

        bookingNumber: formattedBookings[0].bookingNumber,

        status: groupStatus,

        paymentStatus: payment.status,

        bookingType: formattedBookings[0].bookingType,

        bookings: formattedBookings,

        seats,

        totalSeats: seats.length,

        totalFare,

        activeFare,

        refundedAmount: Number(payment.refundedAmount || 0),

        paymentId: payment._id,

        trip: formattedBookings[0].trip || null,

        route: formattedBookings[0].route || null,

        boardingStop: formattedBookings[0].boardingStop || null,

        droppingStop: formattedBookings[0].droppingStop || null,

        driver: formattedBookings[0].driver || null,

        vehicle: formattedBookings[0].vehicle || null,

        canCancel,
      });
    }

    return res.status(200).json({
      success: true,

      count: result.length,

      bookings: result,
    });
  } catch (error) {
    console.error("Get my bookings error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// ======================================
// GET SINGLE / GROUPED BOOKING
// ======================================

const getMyBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;

    if (
      !bookingId ||
      bookingId === "undefined" ||
      !mongoose.Types.ObjectId.isValid(bookingId)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid booking ID",
      });
    }

    const booking = await Booking.findOne({
      _id: bookingId,

      customer: req.user.id,
    }).populate({
      path: "trip",

      populate: [
        {
          path: "route",
        },
        {
          path: "vehicle",
        },
        {
          path: "driver",
          select: "name phone email",
        },
      ],
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    const payment = await Payment.findOne({
      customer: req.user.id,

      bookings: booking._id,
    });

    // ==================================
    // SINGLE BOOKING
    // ==================================

    if (
      !payment ||
      !Array.isArray(payment.bookings) ||
      payment.bookings.length === 0
    ) {
      const formatted = formatBooking(booking);

      return res.status(200).json({
        success: true,

        booking: {
          ...formatted,

          bookings: [formatted],

          seats: [
            {
              seatNumber: formatted.seatNumber,

              fare: formatted.fare,

              bookingId: formatted.id,

              bookingNumber: formatted.bookingNumber,

              status: formatted.status,
            },
          ],

          totalFare: Number(formatted.fare || 0),

          activeFare:
            formatted.status === "CANCELLED" ? 0 : Number(formatted.fare || 0),

          paymentId: payment?._id || null,

          paymentStatus: payment?.status || formatted.paymentStatus,

          canCancel:
            formatted.status === "CONFIRMED" &&
            formatted.paymentStatus === "PAID",
        },
      });
    }

    // ==================================
    // FIND ALL BOOKINGS
    // ==================================

    const groupedBookings = await Booking.find({
      _id: {
        $in: payment.bookings,
      },

      customer: req.user.id,
    }).populate({
      path: "trip",

      populate: [
        {
          path: "route",
        },
        {
          path: "vehicle",
        },
        {
          path: "driver",
          select: "name phone email",
        },
      ],
    });

    const bookingMap = new Map(
      groupedBookings.map((item) => [item._id.toString(), item]),
    );

    const orderedBookings = payment.bookings
      .map((id) => bookingMap.get(id.toString()))
      .filter(Boolean);

    const formattedBookings = orderedBookings.map(formatBooking);

    const seats = formattedBookings.map((item) => ({
      seatNumber: item.seatNumber,

      fare: Number(item.fare || 0),

      bookingId: item.id,

      bookingNumber: item.bookingNumber,

      status: item.status,

      refundedAmount: Number(item.refundedAmount || 0),
    }));

    const totalFare = seats.reduce(
      (total, seat) => total + Number(seat.fare || 0),
      0,
    );

    const activeBookings = formattedBookings.filter(
      (item) => item.status !== "CANCELLED",
    );

    const activeFare = activeBookings.reduce(
      (total, item) => total + Number(item.fare || 0),
      0,
    );

    const allCancelled =
      formattedBookings.length > 0 &&
      formattedBookings.every((item) => item.status === "CANCELLED");

    return res.status(200).json({
      success: true,

      booking: {
        id: formattedBookings[0]?.id,

        bookingNumber: formattedBookings[0]?.bookingNumber,

        status: allCancelled
          ? "CANCELLED"
          : activeBookings.every((item) => item.status === "CONFIRMED")
            ? "CONFIRMED"
            : activeBookings[0]?.status,

        paymentStatus: payment.status,

        bookingType: formattedBookings[0]?.bookingType,

        bookings: formattedBookings,

        seats,

        totalSeats: seats.length,

        totalFare,

        activeFare,

        refundedAmount: Number(payment.refundedAmount || 0),

        paymentId: payment._id,

        razorpayPaymentId: payment.razorpayPaymentId,

        trip: formattedBookings[0]?.trip || null,

        route: formattedBookings[0]?.route || null,

        boardingStop: formattedBookings[0]?.boardingStop || null,

        droppingStop: formattedBookings[0]?.droppingStop || null,

        driver: formattedBookings[0]?.driver || null,

        vehicle: formattedBookings[0]?.vehicle || null,

        canCancel:
          activeBookings.length > 0 &&
          activeBookings.every(
            (item) =>
              item.status === "CONFIRMED" && item.paymentStatus === "PAID",
          ),
      },
    });
  } catch (error) {
    console.error("Get booking error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// ======================================
// CANCEL ENTIRE TICKET
// ======================================
//
// One ticket may contain:
//
// Seat 5 -> Booking A
// Seat 6 -> Booking B
//
// This endpoint cancels BOTH.
//
// Refund = complete payment amount.
//
// ======================================

const cancelBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;

    // ----------------------------------
    // Validate ID
    // ----------------------------------

    if (
      !bookingId ||
      bookingId === "undefined" ||
      !mongoose.Types.ObjectId.isValid(bookingId)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid booking ID",
      });
    }

    // ----------------------------------
    // Find booking
    // ----------------------------------

    const booking = await Booking.findOne({
      _id: bookingId,

      customer: req.user.id,
    }).populate({
      path: "trip",
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    // ----------------------------------
    // Find payment
    // ----------------------------------

    const payment = await Payment.findOne({
      customer: req.user.id,

      bookings: booking._id,
    });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment record for this ticket was not found",
      });
    }

    // ----------------------------------
    // Get all bookings in ticket
    // ----------------------------------

    const paymentBookings = await Booking.find({
      _id: {
        $in: payment.bookings,
      },

      customer: req.user.id,
    }).populate({
      path: "trip",
    });

    if (paymentBookings.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No bookings found for this ticket",
      });
    }

    // ----------------------------------
    // Already cancelled?
    // ----------------------------------

    const activeBookings = paymentBookings.filter(
      (item) => item.status !== "CANCELLED",
    );

    if (activeBookings.length === 0) {
      return res.status(400).json({
        success: false,
        message: "This ticket has already been cancelled",
      });
    }

    // ----------------------------------
    // Only confirmed + paid
    // ----------------------------------

    const invalidBooking = activeBookings.find(
      (item) => item.status !== "CONFIRMED" || item.paymentStatus !== "PAID",
    );

    if (invalidBooking) {
      return res.status(400).json({
        success: false,
        message: "Only confirmed and paid tickets can be cancelled",
      });
    }

    // ----------------------------------
    // Trip
    // ----------------------------------

    const trip = activeBookings[0].trip;

    if (!trip) {
      return res.status(404).json({
        success: false,
        message: "Trip not found",
      });
    }

    // ----------------------------------
    // Departure time
    // ----------------------------------

    const departureMinutes = timeToMinutes(trip.departureTime);

    if (departureMinutes === null) {
      return res.status(500).json({
        success: false,
        message: "Unable to determine trip departure time",
      });
    }

    const departureDate = new Date(trip.date);

    departureDate.setHours(0, 0, 0, 0);

    departureDate.setMinutes(departureMinutes);

    const now = new Date();

    const minutesUntilDeparture =
      (departureDate.getTime() - now.getTime()) / (1000 * 60);

    // ----------------------------------
    // ONE HOUR POLICY
    // ----------------------------------

    if (minutesUntilDeparture <= 60) {
      return res.status(400).json({
        success: false,

        message:
          "Cancellation is allowed only before 1 hour of departure. No refund is available now.",

        minutesUntilDeparture: Math.max(0, Math.floor(minutesUntilDeparture)),
      });
    }

    // ----------------------------------
    // Razorpay payment ID
    // ----------------------------------

    if (!payment.razorpayPaymentId) {
      return res.status(400).json({
        success: false,

        message: "Razorpay payment ID is missing. Refund cannot be processed.",
      });
    }

    // ----------------------------------
    // FULL TICKET REFUND
    // ----------------------------------

    const refundAmount = Number(payment.amount);

    if (!Number.isFinite(refundAmount) || refundAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment amount",
      });
    }

    // ----------------------------------
    // Razorpay refund
    // ----------------------------------

    let refund;

    try {
      refund = await createRefund({
        razorpayPaymentId: payment.razorpayPaymentId,

        amount: refundAmount,

        receipt: booking.bookingNumber,
      });
    } catch (refundError) {
      console.error("Razorpay refund error:", refundError);

      return res.status(502).json({
        success: false,

        message:
          "Refund could not be processed. Your ticket has not been cancelled.",

        error:
          refundError?.error?.description ||
          refundError?.message ||
          "Razorpay refund failed",
      });
    }

    // ----------------------------------
    // Cancel ALL bookings
    // ----------------------------------

    const cancelledAt = new Date();

    for (const item of activeBookings) {
      item.status = "CANCELLED";

      item.paymentStatus = "REFUNDED";

      item.cancelledAt = cancelledAt;

      item.refundId = refund.id;

      item.refundedAmount = Number(item.fare || 0);

      await item.save();
    }

    // ----------------------------------
    // Update payment
    // ----------------------------------

    payment.status = "REFUNDED";

    payment.refundId = refund.id;

    payment.refundedAmount = refundAmount;

    payment.refundedAt = cancelledAt;

    await payment.save();

    // ----------------------------------
    // Response
    // ----------------------------------

    return res.status(200).json({
      success: true,

      message: "Ticket cancelled and full refund processed",

      refund: {
        id: refund.id,

        amount: refundAmount,

        currency: payment.currency,

        status: refund.status,
      },

      cancelledBookings: activeBookings.map((item) => ({
        id: item._id,

        bookingNumber: item.bookingNumber,

        seatNumber: item.seatNumber,

        fare: item.fare,

        status: item.status,

        paymentStatus: item.paymentStatus,

        refundedAmount: item.refundedAmount,

        cancelledAt: item.cancelledAt,
      })),

      payment: {
        id: payment._id,

        status: payment.status,

        refundedAmount: payment.refundedAmount,
      },
    });
  } catch (error) {
    console.error("Cancel booking error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to cancel ticket",
    });
  }
};

module.exports = {
  getMyBookings,
  getMyBooking,
  cancelBooking,
};
