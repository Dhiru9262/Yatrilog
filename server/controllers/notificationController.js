const Notification = require("../models/Notification");

// ======================================
// GET MY NOTIFICATIONS
// ======================================

const getMyNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({
      user: req.user.id,
    })
      .populate("booking", "bookingNumber status")
      .populate("trip", "date departureTime arrivalTime")
      .sort({
        createdAt: -1,
      });

    res.status(200).json({
      success: true,
      count: notifications.length,
      unreadCount: notifications.filter((notification) => !notification.read)
        .length,
      notifications,
    });
  } catch (error) {
    console.error("Get notifications error:", error);

    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// ======================================
// MARK ONE AS READ
// ======================================

const markNotificationRead = async (req, res) => {
  try {
    const notification = await Notification.findOne({
      _id: req.params.id,
      user: req.user.id,
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found",
      });
    }

    notification.read = true;

    await notification.save();

    res.status(200).json({
      success: true,
      message: "Notification marked as read",
      notification,
    });
  } catch (error) {
    console.error("Mark notification read error:", error);

    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// ======================================
// MARK ALL AS READ
// ======================================

const markAllNotificationsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      {
        user: req.user.id,
        read: false,
      },
      {
        $set: {
          read: true,
        },
      },
    );

    res.status(200).json({
      success: true,
      message: "All notifications marked as read",
    });
  } catch (error) {
    console.error("Mark all notifications read error:", error);

    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

module.exports = {
  getMyNotifications,
  markNotificationRead,
  markAllNotificationsRead,
};
