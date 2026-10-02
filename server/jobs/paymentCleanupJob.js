const {
  expireAbandonedPayments,
} = require("../services/paymentCleanupService");

// ======================================
// START PAYMENT CLEANUP JOB
// ======================================

const startPaymentCleanupJob = () => {
  // Run immediately when server starts
  expireAbandonedPayments();

  // Then check every minute
  const paymentCleanupInterval = setInterval(() => {
    expireAbandonedPayments();
  }, 60 * 1000);

  console.log("Payment cleanup job started");

  return paymentCleanupInterval;
};

module.exports = {
  startPaymentCleanupJob,
};
