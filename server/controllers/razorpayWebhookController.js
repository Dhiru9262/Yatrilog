const crypto = require("crypto");
const Payment = require("../models/Payment");
const { recoverCapturedPayment } = require("../services/paymentBookingRecoveryService");

const verifyWebhookSignature = (rawBody, receivedSignature) => {
  if (!Buffer.isBuffer(rawBody) || !receivedSignature || !process.env.RAZORPAY_WEBHOOK_SECRET) {
    return false;
  }
  const expected = crypto
    .createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET)
    .update(rawBody)
    .digest("hex");
  const expectedBuffer = Buffer.from(expected, "utf8");
  const receivedBuffer = Buffer.from(receivedSignature, "utf8");
  return expectedBuffer.length === receivedBuffer.length &&
    crypto.timingSafeEqual(expectedBuffer, receivedBuffer);
};

const razorpayWebhook = async (req, res) => {
  try {
    const signature = req.headers["x-razorpay-signature"];
    const eventId = req.headers["x-razorpay-event-id"];
    const rawBody = req.body;

    if (!verifyWebhookSignature(rawBody, signature)) {
      return res.status(400).json({ success: false, message: "Invalid webhook signature" });
    }

    const payload = JSON.parse(rawBody.toString("utf8"));
    const event = payload.event;
    const paymentEntity = payload.payload?.payment?.entity;

    if (!paymentEntity?.order_id) {
      return res.status(200).json({ success: true, message: "No payment order to process" });
    }

    const payment = await Payment.findOne({ razorpayOrderId: paymentEntity.order_id });

    if (!payment) {
      // Razorpay retries only when a non-2xx response is returned. Keep this
      // visible for reconciliation rather than retrying an unmatchable order forever.
      console.error("Captured/failed Razorpay payment has no local order:", paymentEntity.order_id);
      return res.status(200).json({ success: true, message: "Order not found locally; logged for reconciliation" });
    }

    if (eventId && payment.webhookEventId === eventId &&
        (payment.recoveryStatus === "RECOVERED" || payment.recoveryStatus === "REFUND_REQUIRED")) {
      return res.status(200).json({ success: true, message: "Webhook already handled" });
    }

    if (event === "payment.captured") {
      const amountMatches = Number(paymentEntity.amount) === Math.round(Number(payment.amount) * 100);
      const currencyMatches = String(paymentEntity.currency || "").toUpperCase() === String(payment.currency || "INR").toUpperCase();

      if (!amountMatches || !currencyMatches) {
        payment.status = "PAID";
        payment.razorpayPaymentId = paymentEntity.id;
        payment.recoveryStatus = "REFUND_REQUIRED";
        payment.recoveryError = !amountMatches
          ? "Captured amount does not match the locally calculated order amount."
          : "Captured currency does not match the local payment currency.";
        if (eventId) {
          payment.webhookEventId = eventId;
          payment.webhookProcessedAt = new Date();
        }
        await payment.save();
        console.error("Razorpay capture requires reconciliation:", payment.razorpayOrderId, payment.recoveryError);
        return res.status(200).json({ success: true, message: "Payment captured; reconciliation required" });
      }

      const recovered = await recoverCapturedPayment({
        paymentId: payment._id,
        razorpayPaymentId: paymentEntity.id,
        webhookEventId: eventId,
      });

      if (recovered.status === "REFUND_REQUIRED") {
        console.error("Captured payment could not safely recover ticket:", payment.razorpayOrderId);
      }

      return res.status(200).json({
        success: true,
        message: recovered.status === "RECOVERED"
          ? "Captured payment processed"
          : "Payment captured; manual refund/reconciliation required",
      });
    }

    if (event === "payment.failed") {
      // A delayed failure event must never overwrite a successful capture.
      if (payment.status !== "PAID") {
        payment.status = "FAILED";
        if (eventId) {
          payment.webhookEventId = eventId;
          payment.webhookProcessedAt = new Date();
        }
        await payment.save();
      }
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("Razorpay webhook error:", error);
    // Non-2xx asks Razorpay to retry transient failures.
    return res.status(500).json({ success: false, message: "Webhook processing failed" });
  }
};

module.exports = { razorpayWebhook };
