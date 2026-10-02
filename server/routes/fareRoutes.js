const express = require("express");

const {
  getTripFares,
  saveTripFares,
  getExactFare,
} = require("../controllers/fareController");

const protect = require("../middleware/authMiddleware");
const allowRoles = require("../middleware/roleMiddleware");

const router = express.Router();

// Get fare configuration
router.get(
  "/trip/:tripId",
  protect,
  allowRoles("ADMIN", "OWNER"),
  getTripFares,
);

// Save fares
router.put("/trip/:tripId", protect, allowRoles("OWNER"), saveTripFares);

// Get one exact fare
router.get(
  "/trip/:tripId/:fromStopId/:toStopId",
  protect,
  allowRoles("ADMIN", "OWNER", "AGENT", "CUSTOMER"),
  getExactFare,
);

module.exports = router;
