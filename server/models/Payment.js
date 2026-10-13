const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
  {
    bookings: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Booking",
      },
    ],

    locks: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "SeatLock",
      },
    ],

    // Immutable server-calculated seat/fare details retained for recovery if
    // Razorpay captures payment after temporary seat locks have expired.
    bookingSnapshot: [
      {
        trip: { type: mongoose.Schema.Types.ObjectId, ref: "Trip", required: true },
        seatNumber: { type: String, required: true },
        boardingStop: { type: mongoose.Schema.Types.ObjectId, required: true },
        droppingStop: { type: mongoose.Schema.Types.ObjectId, required: true },
        boardingSequence: { type: Number, required: true },
        droppingSequence: { type: Number, required: true },
        fare: { type: Number, required: true, min: 0 },
      },
    ],

    recoveryStatus: {
      type: String,
      enum: ["NOT_REQUIRED", "PENDING", "RECOVERED", "REFUND_REQUIRED"],
      default: "NOT_REQUIRED",
    },

    recoveryError: {
      type: String,
      default: null,
    },

    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    amount: {
      type: Number,
      required: true,
      min: 0,
    },

    currency: {
      type: String,
      default: "INR",
    },

    razorpayOrderId: {
      type: String,
      required: true,
      unique: true,
    },

    razorpayPaymentId: {
      type: String,
      default: null,
    },

    razorpaySignature: {
      type: String,
      default: null,
    },

    webhookEventId: {
      type: String,
      default: undefined,
    },

    webhookProcessedAt: {
      type: Date,
      default: null,
    },

    status: {
      type: String,
      enum: ["CREATED", "PAID", "FAILED", "EXPIRED", "REFUNDED"],
      default: "CREATED",
    },

    // Last refund ID.
    refundId: {
      type: String,
      default: null,
    },

    // Total amount refunded across all seats.
    refundedAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    refundedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

paymentSchema.index(
  { webhookEventId: 1 },
  {
    unique: true,

    partialFilterExpression: {
      webhookEventId: {
        $type: "string",
      },
    },
  },
);

paymentSchema.index({
  status: 1,

  createdAt: 1,
});

paymentSchema.index({
  customer: 1,

  createdAt: -1,
});

module.exports = mongoose.model("Payment", paymentSchema);
