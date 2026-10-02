const mongoose = require("mongoose");

const stopSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    sequence: {
      type: Number,
      required: true,
    },
  },
  {
    _id: true,
  },
);

const routeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    stops: {
      type: [stopSchema],
      required: true,
      validate: {
        validator: function (stops) {
          return stops.length >= 2;
        },
        message: "A route must have at least two stops",
      },
    },

    status: {
      type: String,
      enum: ["ACTIVE", "BLOCKED"],
      default: "ACTIVE",
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("Route", routeSchema);
