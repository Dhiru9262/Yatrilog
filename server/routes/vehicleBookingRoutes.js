const express = require("express");
const { getVehicleBookings } = require("../controllers/vehicleBookingController");
const protect = require("../middleware/authMiddleware");
const allowRoles = require("../middleware/roleMiddleware");
const router = express.Router();
router.get("/:vehicleId/bookings", protect, allowRoles("OWNER", "AGENT", "ADMIN"), getVehicleBookings);
module.exports = router;
