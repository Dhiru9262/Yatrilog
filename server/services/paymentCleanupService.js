const Payment = require("../models/Payment");
const SeatLock = require("../models/SeatLock");

// ======================================
// EXPIRE ABANDONED PAYMENTS
// ======================================

const expireAbandonedPayments = async () => {
  try {
    // Payments that are still CREATED
    // and are old enough to be considered abandoned.

    const waitingMinutes = Number.parseInt(
      process.env.PAYMENT_WAITING_TIME_MINUTES || "10",
      10,
    );

    const expiryTime = new Date(
      Date.now() - waitingMinutes * 60 * 1000,
    );

    const payments = await Payment.find({
      status: "CREATED",

      createdAt: {
        $lt: expiryTime,
      },
    });

    if (payments.length === 0) {
      return;
    }

    for (const payment of payments) {
      try {
        // ==================================
        // GET PAYMENT LOCKS
        // ==================================

        const lockIds = Array.isArray(payment.locks) ? payment.locks : [];

        // ==================================
        // RELEASE LOCKS
        // ==================================

        if (lockIds.length > 0) {
          await SeatLock.deleteMany({
            _id: {
              $in: lockIds,
            },
          });
        }

        // ==================================
        // MARK PAYMENT EXPIRED
        // ==================================

        payment.status = "EXPIRED";

        await payment.save();

        console.log(`Payment ${payment.razorpayOrderId} expired`);

        console.log(`Released ${lockIds.length} seat lock(s)`);
      } catch (error) {
        console.error(`Failed to cleanup payment ${payment._id}:`, error);
      }
    }
  } catch (error) {
    console.error("Payment cleanup error:", error);
  }
};

module.exports = {
  expireAbandonedPayments,
};
