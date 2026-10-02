const SeatLock = require("../models/SeatLock");
const Trip = require("../models/Trip");
const { emitSeatUpdate } = require("../socket/seatSocket");

const { createSeatLock } = require("../services/seatLockService");

// ======================================
// LOCK SEAT
// ======================================

const lockSeat = async (req, res) => {
  try {
    const { tripId, boardingStop, droppingStop, seatNumbers } = req.body;

    // ======================================
    // VALIDATE REQUEST
    // ======================================

    if (
      !tripId ||
      !boardingStop ||
      !droppingStop ||
      !Array.isArray(seatNumbers) ||
      seatNumbers.length === 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "tripId, boardingStop, droppingStop and seatNumbers are required",
      });
    }

    // ======================================
    // REMOVE DUPLICATES
    // ======================================

    const uniqueSeatNumbers = [
      ...new Set(seatNumbers.map((seat) => String(seat).trim())),
    ];

    // ======================================
    // GET TRIP
    // ======================================

    const trip = await Trip.findById(tripId)
      .populate("route")
      .populate("vehicle");

    if (!trip) {
      return res.status(404).json({
        success: false,
        message: "Trip not found",
      });
    }

    if (trip.status !== "SCHEDULED") {
      return res.status(400).json({
        success: false,
        message: "This trip is not available for booking",
      });
    }

    // ======================================
    // FIND STOPS
    // ======================================

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

    // ======================================
    // VALIDATE DIRECTION
    // ======================================

    if (fromStop.sequence >= toStop.sequence) {
      return res.status(400).json({
        success: false,
        message: "Boarding stop must come before dropping stop",
      });
    }

    // ======================================
    // VALIDATE ALL SEATS
    // ======================================

    const parsedSeats = uniqueSeatNumbers.map((seatNumber) =>
      Number(seatNumber),
    );

    for (const seat of parsedSeats) {
      if (
        !Number.isInteger(seat) ||
        seat < 1 ||
        seat > trip.vehicle.totalSeats
      ) {
        return res.status(400).json({
          success: false,
          message: `Invalid seat number: ${seat}`,
        });
      }
    }

    // ======================================
    // CREATE LOCKS
    // ======================================

    const locks = [];

    try {
      for (const seat of parsedSeats) {
        const lock = await createSeatLock({
          tripId,

          seatNumber: String(seat),

          boardingSequence: fromStop.sequence,

          droppingSequence: toStop.sequence,

          customerId: req.user.id,
        });

        locks.push(lock);

        emitSeatUpdate({
          tripId,

          seatNumber: lock.seatNumber,

          status: "LOCKED",

          boardingSequence: lock.boardingSequence,

          droppingSequence: lock.droppingSequence,
        });
      }
    } catch (error) {
      // ==================================
      // IMPORTANT
      // ==================================

      /*
       * If seat 1 gets locked successfully
       * but seat 2 fails, release the locks
       * already created by this request.
       */

      if (locks.length > 0) {
        for (const lock of locks) {
          await SeatLock.deleteOne({
            _id: lock._id,
          });

          emitSeatUpdate({
            tripId,

            seatNumber: lock.seatNumber,

            status: "AVAILABLE",

            boardingSequence: lock.boardingSequence,

            droppingSequence: lock.droppingSequence,
          });
        }
      }

      if (error.message === "SEAT_ALREADY_BOOKED") {
        return res.status(409).json({
          success: false,
          message:
            "One or more selected seats are already booked for this journey segment",
        });
      }

      if (error.message === "SEAT_ALREADY_LOCKED") {
        return res.status(409).json({
          success: false,
          message:
            "One or more selected seats are temporarily locked by another customer",
        });
      }

      throw error;
    }

    // ======================================
    // RESPONSE
    // ======================================

    return res.status(201).json({
      success: true,

      message: "Seats temporarily locked",

      locks: locks.map((lock) => ({
        id: lock._id,

        tripId: lock.trip,

        seatNumber: lock.seatNumber,

        boardingSequence: lock.boardingSequence,

        droppingSequence: lock.droppingSequence,

        expiresAt: lock.expiresAt,
      })),
    });
  } catch (error) {
    console.error("Lock seats error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// ======================================
// GET MY ACTIVE LOCK
// ======================================

const getMySeatLock = async (req, res) => {
  try {
    const { tripId } = req.params;

    const lock = await SeatLock.findOne({
      trip: tripId,

      customer: req.user.id,

      expiresAt: {
        $gt: new Date(),
      },
    });

    if (!lock) {
      return res.status(404).json({
        success: false,
        message: "No active seat lock found",
      });
    }

    res.status(200).json({
      success: true,
      lock,
    });
  } catch (error) {
    console.error("Get seat lock error:", error);

    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// ======================================
// RELEASE LOCK
// ======================================

const releaseSeatLock = async (req, res) => {
  try {
    const { lockId } = req.params;

    const lock = await SeatLock.findOne({
      _id: lockId,
      customer: req.user.id,
    });

    if (!lock) {
      return res.status(404).json({
        success: false,
        message: "Seat lock not found",
      });
    }

    await SeatLock.deleteOne({
      _id: lockId,
    });

    emitSeatUpdate({
      tripId: lock.trip,

      seatNumber: lock.seatNumber,

      status: "AVAILABLE",

      boardingSequence: lock.boardingSequence,

      droppingSequence: lock.droppingSequence,
    });

    res.status(200).json({
      success: true,
      message: "Seat lock released",
    });
  } catch (error) {
    console.error("Release seat lock error:", error);

    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

module.exports = {
  lockSeat,
  getMySeatLock,
  releaseSeatLock,
};
