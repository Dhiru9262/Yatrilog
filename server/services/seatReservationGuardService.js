const SeatReservationGuard = require("../models/SeatReservationGuard");

// Must be called with an active MongoDB transaction session. Every operation
// that reserves a seat or converts a lock into a booking touches the same
// unique trip/seat document, so concurrent transactions conflict and retry.
const touchSeatReservationGuard = async ({ tripId, seatNumber, session }) => {
  await SeatReservationGuard.findOneAndUpdate(
    { trip: tripId, seatNumber: String(seatNumber) },
    { $inc: { version: 1 }, $setOnInsert: { trip: tripId, seatNumber: String(seatNumber) } },
    { upsert: true, new: true, session, setDefaultsOnInsert: true },
  );
};

module.exports = { touchSeatReservationGuard };
