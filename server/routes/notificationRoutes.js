const express = require("express");

const {
  getMyNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} = require("../controllers/notificationController");

const protect = require("../middleware/authMiddleware");

const router = express.Router();

// Get logged-in user's notifications
router.get("/", protect, getMyNotifications);

// Mark one notification as read
router.patch("/:id/read", protect, markNotificationRead);

// Mark all notifications as read
router.patch("/read-all", protect, markAllNotificationsRead);

module.exports = router;
