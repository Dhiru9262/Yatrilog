const Booking = require("../models/Booking");

// ======================================
// CHECK SEGMENT OVERLAP
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
// CHECK WHETHER A SEAT IS AVAILABLE
// ======================================

const isSeatAvailable = async (
  tripId,
  seatNumber,
  requestedStart,
  requestedEnd,
) => {
  const bookings = await Booking.find({
    trip: tripId,
    seatNumber,
    status: {
      $in: ["PENDING", "CONFIRMED"],
    },
  });

  for (const booking of bookings) {
    const overlap = segmentsOverlap(
      booking.boardingSequence,
      booking.droppingSequence,
      requestedStart,
      requestedEnd,
    );

    if (overlap) {
      return false;
    }
  }

  return true;
};

module.exports = {
  segmentsOverlap,
  isSeatAvailable,
};
