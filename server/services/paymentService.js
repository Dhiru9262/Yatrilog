const crypto = require("crypto");

const razorpay = require("../config/razorpay");

// ======================================
// CREATE RAZORPAY ORDER
// ======================================

const createPaymentOrder = async ({ amount, receipt }) => {
  const options = {
    amount: Math.round(amount * 100),
    currency: "INR",
    receipt,
  };

  const order = await razorpay.orders.create(options);

  return order;
};

// ======================================
// VERIFY PAYMENT SIGNATURE
// ======================================

const verifyPaymentSignature = ({ orderId, paymentId, receivedSignature }) => {
  const body = `${orderId}|${paymentId}`;

  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(body)
    .digest("hex");

  const expectedBuffer = Buffer.from(expectedSignature, "utf8");

  const receivedBuffer = Buffer.from(receivedSignature, "utf8");

  if (expectedBuffer.length !== receivedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(expectedBuffer, receivedBuffer);
};

// refund
const createRefund = async ({ razorpayPaymentId, amount, receipt }) => {
  const refund = await razorpay.payments.refund(razorpayPaymentId, {
    amount: Math.round(amount * 100),

    notes: {
      receipt,
    },
  });

  return refund;
};

module.exports = {
  createPaymentOrder,
  verifyPaymentSignature,
  createRefund,
};
