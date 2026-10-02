const mongoose = require("mongoose");

const seatLockSchema = new mongoose.Schema(
  {
    trip: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Trip",
      required: true,
    },

    seatNumber: {
      type: String,
      required: true,
    },

    boardingSequence: {
      type: Number,
      required: true,
    },

    droppingSequence: {
      type: Number,
      required: true,
    },

    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    expiresAt: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

// MongoDB automatically removes expired locks
seatLockSchema.index(
  {
    expiresAt: 1,
  },
  {
    expireAfterSeconds: 0,
  },
);

seatLockSchema.index({
  trip: 1,
  seatNumber: 1,
  expiresAt: 1,
});
seatLockSchema.index({
  customer: 1,
  trip: 1,
  expiresAt: 1,
});

module.exports = mongoose.model("SeatLock", seatLockSchema);
