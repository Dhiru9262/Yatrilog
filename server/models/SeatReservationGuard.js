const mongoose = require("mongoose");

// A per-trip/per-seat document serializes seat-lock creation and the
// lock-to-booking transition inside MongoDB transactions.
const seatReservationGuardSchema = new mongoose.Schema({
  trip: { type: mongoose.Schema.Types.ObjectId, ref: "Trip", required: true },
  seatNumber: { type: String, required: true },
  version: { type: Number, default: 0 },
}, { timestamps: true });

seatReservationGuardSchema.index({ trip: 1, seatNumber: 1 }, { unique: true });

module.exports = mongoose.model("SeatReservationGuard", seatReservationGuardSchema);
