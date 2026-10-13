const mongoose = require("mongoose");

const Booking = require("../models/Booking");
const Payment = require("../models/Payment");
const SeatLock = require("../models/SeatLock");
const generateBookingNumber = require("../utils/generateBookingNumber");
const { createNotification } = require("./notificationService");
const { emitSeatUpdate } = require("../socket/seatSocket");
const { touchSeatReservationGuard } = require("./seatReservationGuardService");

const segmentsOverlap = (existingStart, existingEnd, requestedStart, requestedEnd) =>
  existingStart < requestedEnd && requestedStart < existingEnd;

/**
 * Recover ticket creation after Razorpay reports a captured payment.
 * The immutable bookingSnapshot is captured when the order is created, so
 * recovery does not depend on temporary SeatLock documents still existing.
 */
const recoverCapturedPayment = async ({
  paymentId,
  razorpayPaymentId,
  webhookEventId,
}) => {
  const session = await mongoose.startSession();
  let result = { status: "RECOVERED", bookings: [], tripId: null };

  try {
    await session.withTransaction(async () => {
      const payment = await Payment.findById(paymentId).session(session);

      if (!payment) throw new Error("PAYMENT_NOT_FOUND");

      payment.status = "PAID";
      payment.razorpayPaymentId = razorpayPaymentId;

      if (webhookEventId) {
        payment.webhookEventId = webhookEventId;
        payment.webhookProcessedAt = new Date();
      }

      if (payment.bookings?.length) {
        result = {
          status: "RECOVERED",
          bookings: await Booking.find({ _id: { $in: payment.bookings } }).session(session),
          tripId: null,
        };
        await payment.save({ session });
        return;
      }

      const snapshot = Array.isArray(payment.bookingSnapshot) ? payment.bookingSnapshot : [];
      if (!snapshot.length) {
        payment.recoveryStatus = "REFUND_REQUIRED";
        payment.recoveryError = "Booking snapshot missing; ticket cannot be safely recovered automatically.";
        await payment.save({ session });
        result = { status: "REFUND_REQUIRED", bookings: [], tripId: null };
        return;
      }

      const tripIds = [...new Set(snapshot.map((item) => String(item.trip)))];
      if (tripIds.length !== 1) {
        payment.recoveryStatus = "REFUND_REQUIRED";
        payment.recoveryError = "Payment snapshot contains multiple trips.";
        await payment.save({ session });
        result = { status: "REFUND_REQUIRED", bookings: [], tripId: null };
        return;
      }

      // Never confirm a paid ticket if another confirmed/pending booking or
      // another customer's live lock now occupies any requested route segment.
      const guardKeys = [...new Map(
        snapshot.map((item) => [
          `${String(item.trip)}:${String(item.seatNumber)}`,
          { tripId: item.trip, seatNumber: String(item.seatNumber) },
        ]),
      ).values()].sort((a, b) =>
        `${a.tripId}:${a.seatNumber}`.localeCompare(`${b.tripId}:${b.seatNumber}`),
      );
      for (const guard of guardKeys) {
        await touchSeatReservationGuard({ ...guard, session });
      }

      for (const item of snapshot) {
        const existingBookings = await Booking.find({
          trip: item.trip,
          seatNumber: item.seatNumber,
          status: { $in: ["PENDING", "CONFIRMED"] },
        }).session(session);

        const bookingConflict = existingBookings.some((booking) =>
          segmentsOverlap(
            booking.boardingSequence,
            booking.droppingSequence,
            item.boardingSequence,
            item.droppingSequence,
          ),
        );

        const otherLocks = await SeatLock.find({
          trip: item.trip,
          seatNumber: item.seatNumber,
          expiresAt: { $gt: new Date() },
          customer: { $ne: payment.customer },
        }).session(session);

        const lockConflict = otherLocks.some((lock) =>
          segmentsOverlap(
            lock.boardingSequence,
            lock.droppingSequence,
            item.boardingSequence,
            item.droppingSequence,
          ),
        );

        if (bookingConflict || lockConflict) {
          payment.recoveryStatus = "REFUND_REQUIRED";
          payment.recoveryError = `Seat ${item.seatNumber} is no longer safely available; manual refund/reconciliation required.`;
          await payment.save({ session });
          result = { status: "REFUND_REQUIRED", bookings: [], tripId: item.trip };
          return;
        }
      }

      const documents = snapshot.map((item) => ({
        bookingNumber: generateBookingNumber(),
        customer: payment.customer,
        trip: item.trip,
        seatNumber: item.seatNumber,
        boardingStop: item.boardingStop,
        droppingStop: item.droppingStop,
        boardingSequence: item.boardingSequence,
        droppingSequence: item.droppingSequence,
        fare: item.fare,
        status: "CONFIRMED",
        paymentStatus: "PAID",
        bookingType: "ONLINE",
        paymentMethod: "RAZORPAY",
      }));

      const bookings = await Booking.create(documents, { session, ordered: true });

      payment.bookings = bookings.map((booking) => booking._id);
      payment.recoveryStatus = "RECOVERED";
      payment.recoveryError = null;
      await payment.save({ session });

      await SeatLock.deleteMany(
        { _id: { $in: payment.locks || [] }, customer: payment.customer },
        { session },
      );

      result = { status: "RECOVERED", bookings, tripId: snapshot[0].trip };
    });
  } finally {
    await session.endSession();
  }

  if (result.status === "RECOVERED" && result.bookings.length) {
    for (const booking of result.bookings) {
      await createNotification({
        user: booking.customer,
        type: "PAYMENT_SUCCESS",
        title: "Payment successful",
        message: `Payment for booking ${booking.bookingNumber} was successful.`,
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
        status: "BOOKED",
        boardingSequence: booking.boardingSequence,
        droppingSequence: booking.droppingSequence,
      });
    }
  }

  return result;
};

module.exports = { recoverCapturedPayment };
