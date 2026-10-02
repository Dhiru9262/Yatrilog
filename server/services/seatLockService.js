const mongoose = require("mongoose");

const SeatLock = require("../models/SeatLock");
const Booking = require("../models/Booking");
const { emitSeatUpdate } = require("../socket/seatSocket");
// ======================================
// SEGMENT OVERLAP
// ======================================

const segmentsOverlap = (
  existingStart,
  existingEnd,
  requestedStart,
  requestedEnd,
) => {
  return existingStart < requestedEnd && requestedStart < existingEnd;
};

// ======================================
// CREATE TEMPORARY SEAT LOCK
// ======================================

const createSeatLock = async ({
  tripId,
  seatNumber,
  boardingSequence,
  droppingSequence,
  customerId,
}) => {
  const session = await mongoose.startSession();

  try {
    let createdLock;

    await session.withTransaction(async () => {
      // ----------------------------------
      // 1. Check existing bookings
      // ----------------------------------

      const bookings = await Booking.find({
        trip: tripId,

        seatNumber,

        status: {
          $in: ["PENDING", "CONFIRMED"],
        },
      }).session(session);

      for (const booking of bookings) {
        const overlap = segmentsOverlap(
          booking.boardingSequence,
          booking.droppingSequence,
          boardingSequence,
          droppingSequence,
        );

        if (overlap) {
          throw new Error("SEAT_ALREADY_BOOKED");
        }
      }

      // ----------------------------------
      // 2. Check existing active locks
      // ----------------------------------

      const locks = await SeatLock.find({
        trip: tripId,

        seatNumber,

        expiresAt: {
          $gt: new Date(),
        },
      }).session(session);

      for (const lock of locks) {
        const overlap = segmentsOverlap(
          lock.boardingSequence,
          lock.droppingSequence,
          boardingSequence,
          droppingSequence,
        );

        if (overlap) {
          throw new Error("SEAT_ALREADY_LOCKED");
        }
      }

      // ----------------------------------
      // 3. Create lock
      // ----------------------------------

      const waitingMinutes = Number.parseInt(
        process.env.PAYMENT_WAITING_TIME_MINUTES || "10",
        10,
      );

      if (!Number.isFinite(waitingMinutes) || waitingMinutes <= 0) {
        throw new Error("INVALID_PAYMENT_WAITING_TIME");
      }

      const expiresAt = new Date(
        Date.now() + waitingMinutes * 60 * 1000,
      );

      const locksCreated = await SeatLock.create(
        [
          {
            trip: tripId,

            seatNumber,

            boardingSequence,

            droppingSequence,

            customer: customerId,

            expiresAt,
          },
        ],
        {
          session,
        },
      );

      createdLock = locksCreated[0];
    });

    return createdLock;
  } finally {
    await session.endSession();
  }
};

// ======================================
// RELEASE EXPIRED SEAT LOCKS
// ======================================

const releaseExpiredSeatLocks = async () => {
  try {
    const now = new Date();

    const expiredLocks = await SeatLock.find({
      expiresAt: {
        $lte: now,
      },
    });

    if (expiredLocks.length === 0) {
      return;
    }

    for (const lock of expiredLocks) {
      emitSeatUpdate({
        tripId: lock.trip,

        seatNumber: lock.seatNumber,

        status: "AVAILABLE",

        boardingSequence: lock.boardingSequence,

        droppingSequence: lock.droppingSequence,
      });
    }

    await SeatLock.deleteMany({
      expiresAt: {
        $lte: now,
      },
    });

    console.log(`${expiredLocks.length} expired seat lock(s) released`);
  } catch (error) {
    console.error("Release expired seat locks error:", error);
  }
};

module.exports = {
  segmentsOverlap,
  createSeatLock,
  releaseExpiredSeatLocks,
};
