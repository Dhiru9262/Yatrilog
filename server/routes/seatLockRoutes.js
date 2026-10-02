const express = require("express");

const {
  lockSeat,
  getMySeatLock,
  releaseSeatLock,
} = require("../controllers/seatLockController");

const protect = require("../middleware/authMiddleware");
const allowRoles = require("../middleware/roleMiddleware");

const router = express.Router();

// Lock seat
router.post("/", protect, allowRoles("CUSTOMER"), lockSeat);

// Get my active lock
router.get("/trip/:tripId", protect, allowRoles("CUSTOMER"), getMySeatLock);

// Release lock
router.delete("/:lockId", protect, allowRoles("CUSTOMER"), releaseSeatLock);

module.exports = router;
