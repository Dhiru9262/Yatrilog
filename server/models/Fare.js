const mongoose = require("mongoose");

const fareSchema = new mongoose.Schema(
  {
    trip: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Trip",
      required: true,
    },

    fromStop: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },

    toStop: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },

    amount: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  {
    timestamps: true,
  },
);

// One fare for one exact journey on one trip
fareSchema.index(
  {
    trip: 1,
    fromStop: 1,
    toStop: 1,
  },
  {
    unique: true,
  },
);

module.exports = mongoose.model("Fare", fareSchema);
