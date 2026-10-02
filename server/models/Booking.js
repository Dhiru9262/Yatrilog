const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema(
  {
    bookingNumber: {
      type: String,
      unique: true,
      required: true,
    },

    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    // ======================================
    // DRIVER WHO CREATED OFFLINE BOOKING
    // ======================================

    bookedByDriver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    // User (driver or owner) who created an offline/assisted booking.
    bookedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    passengerName: {
      type: String,
      trim: true,
      default: null,
    },

    passengerPhone: {
      type: String,
      trim: true,
      default: null,
    },

    passengerEmail: {
      type: String,
      trim: true,
      lowercase: true,
      default: null,
    },

    trip: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Trip",
      required: true,
    },

    seatNumber: {
      type: String,
      required: true,
    },

    boardingStop: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },

    droppingStop: {
      type: mongoose.Schema.Types.ObjectId,
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

    fare: {
      type: Number,
      required: true,
      min: 0,
    },

    status: {
      type: String,
      enum: ["PENDING", "CONFIRMED", "CANCELLED", "EXPIRED"],
      default: "PENDING",
    },

    paymentStatus: {
      type: String,
      enum: ["PENDING", "PAID", "FAILED", "REFUNDED"],
      default: "PENDING",
    },

    bookingType: {
      type: String,
      enum: ["ONLINE", "OFFLINE"],
      default: "ONLINE",
    },

    paymentMethod: {
      type: String,
      enum: ["RAZORPAY", "CASH", "COUNTER"],
      default: "RAZORPAY",
    },

    // ======================================
    // CANCELLATION
    // ======================================

    cancelledAt: {
      type: Date,
      default: null,
    },

    refundId: {
      type: String,
      default: null,
    },

    refundedAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  },
);

// ======================================
// INDEXES
// ======================================

bookingSchema.index({
  trip: 1,
  seatNumber: 1,
  status: 1,
});

bookingSchema.index({
  customer: 1,
  createdAt: -1,
});

bookingSchema.index({
  trip: 1,
  status: 1,
});

bookingSchema.index({
  customer: 1,
  status: 1,
});

// Driver's offline bookings
bookingSchema.index({
  bookedByDriver: 1,
  bookingType: 1,
  status: 1,
});

bookingSchema.index({
  bookedBy: 1,
  bookingType: 1,
  status: 1,
});

module.exports = mongoose.model("Booking", bookingSchema);
