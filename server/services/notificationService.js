const Notification = require("../models/Notification");

// ======================================
// CREATE NOTIFICATION
// ======================================

const createNotification = async ({
  user,
  type,
  title,
  message,
  booking = null,
  trip = null,
}) => {
  try {
    if (!user) {
      console.warn("Notification skipped: user is missing");

      return null;
    }

    const notification = await Notification.create({
      user,
      type,
      title,
      message,
      booking,
      trip,
    });

    return notification;
  } catch (error) {
    // Notification failure should NOT
    // break booking/payment flow.
    console.error("Create notification error:", error);

    return null;
  }
};

module.exports = {
  createNotification,
};
