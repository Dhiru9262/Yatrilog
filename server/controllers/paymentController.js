const { getFareForTrip } = require("../services/routeFareService");
const mongoose = require("mongoose");

const Payment = require("../models/Payment");
const SeatLock = require("../models/SeatLock");
const Booking = require("../models/Booking");
const Trip = require("../models/Trip");
const Fare = require("../models/Fare");

const { emitSeatUpdate } = require("../socket/seatSocket");

const { createNotification } = require("../services/notificationService");

const {
  createPaymentOrder,
  verifyPaymentSignature,
} = require("../services/paymentService");

const generateBookingNumber = require("../utils/generateBookingNumber");

// ======================================
// FORMAT BOOKING RESPONSE
// ======================================

const formatBookingResponse = (booking, trip) => {
  const currentTrip = trip || booking.trip;

  const boardingStop = currentTrip?.route?.stops?.find(
    (stop) => stop._id.toString() === booking.boardingStop.toString(),
  );

  const droppingStop = currentTrip?.route?.stops?.find(
    (stop) => stop._id.toString() === booking.droppingStop.toString(),
  );

  return {
    id: booking._id,

    bookingNumber: booking.bookingNumber,

    tripId: currentTrip?._id,

    seatNumber: booking.seatNumber,

    boardingStop: boardingStop?.name || null,

    droppingStop: droppingStop?.name || null,

    fare: booking.fare,

    status: booking.status,

    paymentStatus: booking.paymentStatus,

    driver: currentTrip?.driver
      ? {
          name: currentTrip.driver.name,

          phone: currentTrip.driver.phone,

          email: currentTrip.driver.email,
        }
      : null,
  };
};

// ======================================
// CREATE PAYMENT ORDER
// ======================================

const createOrder = async (req, res) => {
  try {
    const { lockIds, lockId } = req.body;

    // ==================================
    // BACKWARD COMPATIBILITY
    // ==================================

    const requestedLockIds =
      Array.isArray(lockIds) && lockIds.length > 0
        ? lockIds
        : lockId
          ? [lockId]
          : [];

    if (requestedLockIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "lockIds are required",
      });
    }

    // ==================================
    // REMOVE DUPLICATES
    // ==================================

    const uniqueLockIds = [
      ...new Set(requestedLockIds.map((id) => String(id))),
    ];

    // ==================================
    // FIND ACTIVE LOCKS
    // ==================================

    const locks = await SeatLock.find({
      _id: {
        $in: uniqueLockIds,
      },

      customer: req.user.id,

      expiresAt: {
        $gt: new Date(),
      },
    });

    // ==================================
    // ALL LOCKS MUST EXIST
    // ==================================

    if (locks.length !== uniqueLockIds.length) {
      return res.status(400).json({
        success: false,
        message: "One or more seat locks are missing or expired",
      });
    }

    // ==================================
    // GET TRIP
    // ==================================

    const trip = await Trip.findById(locks[0].trip)
      .populate("route")
      .populate("vehicle");

    if (!trip) {
      return res.status(404).json({
        success: false,
        message: "Trip not found",
      });
    }

    // ==================================
    // MAKE SURE ALL LOCKS
    // BELONG TO SAME TRIP
    // ==================================

    const invalidTripLock = locks.some(
      (lock) => lock.trip.toString() !== trip._id.toString(),
    );

    if (invalidTripLock) {
      return res.status(400).json({
        success: false,
        message: "All selected seats must belong to the same trip",
      });
    }

    // ==================================
    // TRIP STATUS
    // ==================================

    if (trip.status !== "SCHEDULED") {
      return res.status(400).json({
        success: false,
        message: "Trip is no longer available",
      });
    }

    // ==================================
    // CALCULATE TOTAL FARE
    // ==================================

    let totalAmount = 0;

    for (const lock of locks) {
      const fromStop = trip.route.stops.find(
        (stop) => stop.sequence === lock.boardingSequence,
      );

      const toStop = trip.route.stops.find(
        (stop) => stop.sequence === lock.droppingSequence,
      );

      if (!fromStop || !toStop) {
        return res.status(400).json({
          success: false,
          message: "Invalid journey segment",
        });
      }

      const fare = await getFareForTrip(trip._id, fromStop._id, toStop._id);

      if (!fare) {
        return res.status(400).json({
          success: false,
          message: `Fare not configured for seat ${lock.seatNumber}`,
        });
      }

      totalAmount += fare.amount;
    }

    // ==================================
    // CREATE RAZORPAY ORDER
    // ==================================

    const receipt = `trip_${trip._id}_${Date.now()}`;

    const razorpayOrder = await createPaymentOrder({
      amount: totalAmount,

      receipt,
    });

    // ==================================
    // CREATE PAYMENT RECORD
    // ==================================

    const payment = await Payment.create({
      bookings: [],

      locks: locks.map((lock) => lock._id),

      customer: req.user.id,

      amount: totalAmount,

      currency: "INR",

      razorpayOrderId: razorpayOrder.id,

      status: "CREATED",
    });

    // ==================================
    // RESPONSE
    // ==================================

    return res.status(201).json({
      success: true,

      payment: {
        id: payment._id,

        amount: totalAmount,

        currency: "INR",

        razorpayOrderId: razorpayOrder.id,

        razorpayKeyId: process.env.RAZORPAY_KEY_ID,

        lockIds: locks.map((lock) => lock._id),
      },
    });
  } catch (error) {
    console.error("Create payment order error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// ======================================
// VERIFY PAYMENT + CONFIRM BOOKINGS
// ======================================

const verifyPayment = async (req, res) => {
  try {
    const {
      lockIds,
      lockId,
      razorpayPaymentId,
      razorpayOrderId,
      razorpaySignature,
    } = req.body;

    // ==================================
    // NORMALIZE LOCK IDS
    // ==================================

    const requestedLockIds =
      Array.isArray(lockIds) && lockIds.length > 0
        ? lockIds
        : lockId
          ? [lockId]
          : [];

    if (
      requestedLockIds.length === 0 ||
      !razorpayPaymentId ||
      !razorpayOrderId ||
      !razorpaySignature
    ) {
      return res.status(400).json({
        success: false,
        message: "Payment verification data is incomplete",
      });
    }

    // ==================================
    // REMOVE DUPLICATES
    // ==================================

    const uniqueLockIds = [
      ...new Set(requestedLockIds.map((id) => String(id))),
    ];

    // ==================================
    // FIND PAYMENT
    // ==================================

    const payment = await Payment.findOne({
      razorpayOrderId,

      customer: req.user.id,

      locks: {
        $all: uniqueLockIds,
      },
    });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment record not found",
      });
    }

    // ==================================
    // VERIFY RAZORPAY SIGNATURE
    // ==================================

    const validSignature = verifyPaymentSignature({
      orderId: payment.razorpayOrderId,

      paymentId: razorpayPaymentId,

      receivedSignature: razorpaySignature,
    });

    if (!validSignature) {
      return res.status(400).json({
        success: false,
        message: "Payment signature verification failed",
      });
    }

    // ==================================
    // IDEMPOTENCY
    // ==================================

    if (
      payment.status === "PAID" &&
      Array.isArray(payment.bookings) &&
      payment.bookings.length > 0
    ) {
      const existingBookings = await Booking.find({
        _id: {
          $in: payment.bookings,
        },

        customer: req.user.id,
      });

      const trip = await Trip.findById(existingBookings[0]?.trip)
        .populate("route")
        .populate("driver", "name email phone");

      return res.status(200).json({
        success: true,

        message: "Payment was already verified",

        bookings: existingBookings.map((booking) =>
          formatBookingResponse(booking, trip),
        ),
      });
    }

    // ==================================
    // FIND ACTIVE LOCKS
    // ==================================

    const locks = await SeatLock.find({
      _id: {
        $in: uniqueLockIds,
      },

      customer: req.user.id,

      expiresAt: {
        $gt: new Date(),
      },
    });

    if (locks.length !== uniqueLockIds.length) {
      return res.status(400).json({
        success: false,
        message: "One or more seat locks have expired or were not found",
      });
    }

    // ==================================
    // GET TRIP
    // ==================================

    const trip = await Trip.findById(locks[0].trip)
      .populate("route")
      .populate("vehicle")
      .populate("driver", "name email phone");

    if (!trip) {
      return res.status(404).json({
        success: false,
        message: "Trip not found",
      });
    }

    // ==================================
    // ALL LOCKS SAME TRIP
    // ==================================

    const invalidTripLock = locks.some(
      (lock) => lock.trip.toString() !== trip._id.toString(),
    );

    if (invalidTripLock) {
      return res.status(400).json({
        success: false,
        message: "All selected seats must belong to the same trip",
      });
    }

    // ==================================
    // TRIP STATUS
    // ==================================

    if (trip.status !== "SCHEDULED") {
      return res.status(400).json({
        success: false,
        message: "Trip is no longer available",
      });
    }

    // ==================================
    // VERIFY EACH FARE
    // ==================================

    const bookingData = [];

    let calculatedTotal = 0;

    for (const lock of locks) {
      const boardingStop = trip.route.stops.find(
        (stop) => stop.sequence === lock.boardingSequence,
      );

      const droppingStop = trip.route.stops.find(
        (stop) => stop.sequence === lock.droppingSequence,
      );

      if (!boardingStop || !droppingStop) {
        return res.status(400).json({
          success: false,
          message: "Journey segment no longer exists",
        });
      }

      const fare = await getFareForTrip(trip._id, boardingStop._id, droppingStop._id);

      if (!fare) {
        return res.status(400).json({
          success: false,
          message: `Fare not found for seat ${lock.seatNumber}`,
        });
      }

      calculatedTotal += fare.amount;

      bookingData.push({
        lock,

        boardingStop,

        droppingStop,

        fare,
      });
    }

    // ==================================
    // VERIFY PAYMENT AMOUNT
    // ==================================

    if (calculatedTotal !== payment.amount) {
      return res.status(400).json({
        success: false,
        message: "Payment amount does not match booking fare",
      });
    }

    // ==================================
    // ATOMIC BOOKING CONFIRMATION
    // ==================================

    const session = await mongoose.startSession();

    let bookings = [];

    let bookingAlreadyExists = false;

    try {
      await session.withTransaction(async () => {
        // ==============================
        // RELOAD PAYMENT
        // ==============================

        const paymentInTransaction = await Payment.findById(
          payment._id,
        ).session(session);

        if (!paymentInTransaction) {
          throw new Error("PAYMENT_NOT_FOUND");
        }

        // ==============================
        // DUPLICATE REQUEST
        // ==============================

        if (
          paymentInTransaction.status === "PAID" &&
          paymentInTransaction.bookings?.length > 0
        ) {
          const existingBookings = await Booking.find({
            _id: {
              $in: paymentInTransaction.bookings,
            },
          }).session(session);

          bookings = existingBookings;

          bookingAlreadyExists = true;

          return;
        }

        // ==============================
        // RE-CHECK LOCKS
        // ==============================

        const activeLocks = await SeatLock.find({
          _id: {
            $in: uniqueLockIds,
          },

          customer: req.user.id,

          expiresAt: {
            $gt: new Date(),
          },
        }).session(session);

        if (activeLocks.length !== uniqueLockIds.length) {
          throw new Error("SEAT_LOCK_EXPIRED");
        }

        // ==============================
        // CREATE ONE BOOKING PER SEAT
        // ==============================

        const documents = bookingData.map(
          ({ lock, boardingStop, droppingStop, fare }) => ({
            bookingNumber: generateBookingNumber(),

            customer: req.user.id,

            trip: trip._id,

            seatNumber: lock.seatNumber,

            boardingStop: boardingStop._id,

            droppingStop: droppingStop._id,

            boardingSequence: lock.boardingSequence,

            droppingSequence: lock.droppingSequence,

            fare: fare.amount,

            status: "CONFIRMED",

            paymentStatus: "PAID",

            bookingType: "ONLINE",

            paymentMethod: "RAZORPAY",
          }),
        );

        bookings = await Booking.create(documents, {
          session,
          ordered: true,
        });

        // ==============================
        // UPDATE PAYMENT
        // ==============================

        paymentInTransaction.bookings = bookings.map((booking) => booking._id);

        paymentInTransaction.locks = uniqueLockIds;

        paymentInTransaction.razorpayPaymentId = razorpayPaymentId;

        paymentInTransaction.razorpaySignature = razorpaySignature;

        paymentInTransaction.status = "PAID";

        await paymentInTransaction.save({
          session,
        });

        // ==============================
        // DELETE ALL LOCKS
        // ==============================

        await SeatLock.deleteMany(
          {
            _id: {
              $in: uniqueLockIds,
            },

            customer: req.user.id,
          },
          {
            session,
          },
        );
      });
    } finally {
      await session.endSession();
    }

    // ======================================
    // NOTIFICATIONS + SOCKET UPDATES
    // ======================================

    if (!bookingAlreadyExists) {
      for (const booking of bookings) {
        // ==============================
        // PAYMENT SUCCESS
        // ==============================

        await createNotification({
          user: booking.customer,

          type: "PAYMENT_SUCCESS",

          title: "Payment successful",

          message: `Payment for booking ${booking.bookingNumber} was successful.`,

          booking: booking._id,

          trip: trip._id,
        });

        // ==============================
        // BOOKING CONFIRMED
        // ==============================

        await createNotification({
          user: booking.customer,

          type: "BOOKING_CONFIRMED",

          title: "Booking confirmed",

          message: `Your booking ${booking.bookingNumber} has been confirmed.`,

          booking: booking._id,

          trip: trip._id,
        });

        // ==============================
        // TICKET GENERATED
        // ==============================

        await createNotification({
          user: booking.customer,

          type: "TICKET_GENERATED",

          title: "Ticket generated",

          message: `Your ticket for booking ${booking.bookingNumber} is ready.`,

          booking: booking._id,

          trip: trip._id,
        });

        // ==============================
        // REAL-TIME SEAT UPDATE
        // ==============================

        emitSeatUpdate({
          tripId: trip._id,

          seatNumber: booking.seatNumber,

          status: "BOOKED",

          boardingSequence: booking.boardingSequence,

          droppingSequence: booking.droppingSequence,
        });
      }
    }

    // ======================================
    // RESPONSE
    // ======================================

    return res.status(200).json({
      success: true,

      message: "Payment verified and bookings confirmed",

      bookings: bookings.map((booking) => formatBookingResponse(booking, trip)),
    });
  } catch (error) {
    console.error("Verify payment error:", error);

    if (error.message === "SEAT_LOCK_EXPIRED") {
      return res.status(409).json({
        success: false,
        message:
          "One or more selected seats have expired. Please select your seats again.",
      });
    }

    if (error.message === "PAYMENT_NOT_FOUND") {
      return res.status(404).json({
        success: false,
        message: "Payment record not found",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// ======================================
// EXPORTS
// ======================================

module.exports = {
  createOrder,
  verifyPayment,
};
