const mongoose = require("mongoose");

const stopTimingSchema = new mongoose.Schema(
  {
    stop: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },

    arrivalTime: {
      type: String,
      default: null,
    },

    departureTime: {
      type: String,
      default: null,
    },
  },
  {
    _id: false,
  },
);

const tripSchema = new mongoose.Schema(
  {
    route: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Route",
      required: true,
    },

    vehicle: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vehicle",
      required: true,
    },

    driver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    date: {
      type: Date,
      required: true,
    },

    // Overall trip departure.
    // Kept for backward compatibility and
    // vehicle/driver conflict checking.
    departureTime: {
      type: String,
      required: true,
    },

    // Overall trip arrival.
    // Kept for backward compatibility.
    arrivalTime: {
      type: String,
    },

    // ======================================
    // PER-STOP TIMINGS
    // ======================================
    //
    // Example:
    //
    // [
    //   {
    //     stop: "Haridwar ID",
    //     arrivalTime: null,
    //     departureTime: "06:00"
    //   },
    //   {
    //     stop: "Roorkee ID",
    //     arrivalTime: "07:00",
    //     departureTime: "07:05"
    //   },
    //   {
    //     stop: "Delhi ID",
    //     arrivalTime: "10:45",
    //     departureTime: null
    //   }
    // ]
    //
    // Not required at schema level so existing
    // trips without timings continue working.
    stopTimings: {
      type: [stopTimingSchema],
      default: [],
    },

    // Recurring schedule metadata. Daily schedules are materialized as
    // individual trip documents so each date can be independently disabled.
    isDailySchedule: {
      type: Boolean,
      default: false,
    },
    scheduleKey: {
      type: String,
      default: null,
      index: true,
    },
    scheduleEndDate: {
      type: Date,
      default: null,
    },
    isRunning: {
      type: Boolean,
      default: true,
    },

    status: {
      type: String,
      enum: [
        "DRAFT",
        "FARE_PENDING",
        "SCHEDULED",
        "IN_PROGRESS",
        "COMPLETED",
        "CANCELLED",
      ],
      default: "DRAFT",
    },
  },
  {
    timestamps: true,
  },
);

tripSchema.index({
  driver: 1,
  date: 1,
});

tripSchema.index({
  vehicle: 1,
  date: 1,
});

tripSchema.index({
  route: 1,
  date: 1,
});

tripSchema.index({
  date: 1,
  status: 1,
});

module.exports = mongoose.model("Trip", tripSchema);
