const express = require("express");

const {
  createTrip,
  getTrips,
  getTrip,
  updateTrip,
  updateTripStatus,
  toggleTripRunning,
  getSeatAvailability,
} = require("../controllers/tripController");

const protect = require("../middleware/authMiddleware");
const allowRoles = require("../middleware/roleMiddleware");

const router = express.Router();

// Create trip
router.post("/", protect, allowRoles("ADMIN"), createTrip);

// Get trips
router.get("/", protect, allowRoles("ADMIN", "OWNER", "AGENT"), getTrips);

// Get single trip
router.get("/:id", protect, allowRoles("ADMIN", "OWNER", "AGENT"), getTrip);

// Update trip
router.put("/:id", protect, allowRoles("ADMIN"), updateTrip);

// Change status
router.patch("/:id/status", protect, allowRoles("ADMIN"), updateTripStatus);

router.patch("/:id/running", protect, allowRoles("OWNER", "AGENT"), toggleTripRunning);

router.get(
  "/:id/seats",
  protect,
  allowRoles("CUSTOMER", "AGENT", "OWNER"),
  getSeatAvailability,
);

module.exports = router;
