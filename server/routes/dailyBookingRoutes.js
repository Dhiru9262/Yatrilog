const express = require("express");
const { getDailyBookings } = require("../controllers/dailyBookingController");
const protect = require("../middleware/authMiddleware");
const allowRoles = require("../middleware/roleMiddleware");

const router = express.Router();
router.get("/", protect, allowRoles("ADMIN", "OWNER", "AGENT"), getDailyBookings);

module.exports = router;
