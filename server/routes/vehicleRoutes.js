const express = require("express");

const {
  createVehicle,
  getVehicles,
  getVehicle,
  updateVehicle,
  updateVehicleStatus,
  updateSeatLayout,
} = require("../controllers/vehicleController");

const protect = require("../middleware/authMiddleware");
const allowRoles = require("../middleware/roleMiddleware");

const router = express.Router();

// Create vehicle
router.post("/", protect, allowRoles("ADMIN"), createVehicle);

// Get all vehicles
router.get("/", protect, allowRoles("ADMIN", "OWNER"), getVehicles);

// Get one vehicle
router.get("/:id", protect, allowRoles("ADMIN", "OWNER"), getVehicle);

// Update vehicle
router.put("/:id", protect, allowRoles("ADMIN"), updateVehicle);

// Save canonical drag-and-drop seat layout
router.put("/:id/seat-layout", protect, allowRoles("ADMIN", "OWNER"), updateSeatLayout);

// Block / activate vehicle
router.patch("/:id/status", protect, allowRoles("ADMIN"), updateVehicleStatus);

module.exports = router;
