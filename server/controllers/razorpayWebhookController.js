const crypto = require("crypto");

const Payment = require("../models/Payment");
const Booking = require("../models/Booking");

// ======================================
// VERIFY WEBHOOK SIGNATURE
// ======================================

const verifyWebhookSignature = (rawBody, receivedSignature) => {
  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET)
    .update(rawBody)
    .digest("hex");

  const expectedBuffer = Buffer.from(expectedSignature, "utf8");

  const receivedBuffer = Buffer.from(receivedSignature || "", "utf8");

  if (expectedBuffer.length !== receivedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(expectedBuffer, receivedBuffer);
};

// ======================================
// RAZORPAY WEBHOOK
// ======================================

const razorpayWebhook = async (req, res) => {
  try {
    const signature = req.headers["x-razorpay-signature"];
    const webhookEventId = req.headers["x-razorpay-event-id"];

    if (!signature) {
      return res.status(400).json({
        success: false,
        message: "Webhook signature missing",
      });
    }

    // req.body is a Buffer because
    // express.raw() is used for this route.
    const rawBody = req.body;

    const isValid = verifyWebhookSignature(rawBody, signature);

    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: "Invalid webhook signature",
      });
    }

    const payload = JSON.parse(rawBody.toString("utf8"));

    const event = payload.event;

    if (!webhookEventId) {
      console.warn("Razorpay webhook event ID missing");
    }

    console.log("Razorpay webhook:", event);

    // ==================================
    // PAYMENT CAPTURED
    // ==================================

    if (event === "payment.captured") {
      const paymentEntity = payload.payload?.payment?.entity;

      if (!paymentEntity) {
        return res.status(200).json({
          success: true,
        });
      }

      const razorpayPaymentId = paymentEntity.id;

      const razorpayOrderId = paymentEntity.order_id;

      const payment = await Payment.findOne({
        razorpayOrderId,
      });

      if (!payment) {
        console.log("Payment record not found:", razorpayOrderId);

        return res.status(200).json({
          success: true,
        });
      }

      // ==================================
      // WEBHOOK IDEMPOTENCY
      // ==================================

      if (webhookEventId && payment.webhookEventId === webhookEventId) {
        console.log("Duplicate Razorpay webhook ignored:", webhookEventId);

        return res.status(200).json({
          success: true,
          message: "Webhook already processed",
        });
      }
      // ==================================
      // IDEMPOTENCY
      // ==================================
      // If the payment is already PAID
      // AND a booking already exists,
      // do not process it again.

      if (payment.status === "PAID" && payment.booking) {
        return res.status(200).json({
          success: true,
        });
      }

      // Mark payment as paid
      payment.status = "PAID";

      payment.razorpayPaymentId = razorpayPaymentId;

      if (webhookEventId) {
        payment.webhookEventId = webhookEventId;
        payment.webhookProcessedAt = new Date();
      }

      await payment.save();

      // ==================================
      // UPDATE EXISTING BOOKING
      // ==================================

      if (payment.booking) {
        await Booking.findByIdAndUpdate(payment.booking, {
          paymentStatus: "PAID",
          status: "CONFIRMED",
        });
      }
    }

    // ==================================
    // PAYMENT FAILED
    // ==================================

    if (event === "payment.failed") {
      const paymentEntity = payload.payload?.payment?.entity;

      if (!paymentEntity) {
        return res.status(200).json({
          success: true,
        });
      }

      const razorpayOrderId = paymentEntity.order_id;

      const payment = await Payment.findOne({
        razorpayOrderId,
      });

      if (!payment) {
        return res.status(200).json({
          success: true,
        });
      }

      // Never overwrite a successful payment
      // with a failed webhook.

      if (payment.status !== "PAID") {
        payment.status = "FAILED";

        await payment.save();
      }
    }

    // ==================================
    // WEBHOOK SUCCESS
    // ==================================

    return res.status(200).json({
      success: true,
    });
  } catch (error) {
    console.error("Razorpay webhook error:", error);

    return res.status(500).json({
      success: false,
      message: "Webhook processing failed",
    });
  }
};

module.exports = {
  razorpayWebhook,
};
