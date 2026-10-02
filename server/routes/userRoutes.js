const express = require("express");

const {
  getUsersByRole,
  updateUserStatus,
} = require("../controllers/userController");

const {
  createDriver,
  getDrivers,
  getDriver,
  updateDriver,
  updateDriverStatus,
} = require("../controllers/adminController");

const protect = require("../middleware/authMiddleware");
const allowRoles = require("../middleware/roleMiddleware");

const router = express.Router();

// GET USERS BY ROLE
// GET /api/users?role=OWNER
router.get("/", protect, allowRoles("ADMIN"), getUsersByRole);

// CREATE DRIVER
// POST /api/users/drivers
router.post("/drivers", protect, allowRoles("ADMIN"), createDriver);

// GET ALL DRIVERS
// GET /api/users/drivers
router.get("/drivers", protect, allowRoles("ADMIN"), getDrivers);

// GET SINGLE DRIVER
// GET /api/users/drivers/:id
router.get("/drivers/:id", protect, allowRoles("ADMIN"), getDriver);

// UPDATE DRIVER
// PUT /api/users/drivers/:id
router.put("/drivers/:id", protect, allowRoles("ADMIN"), updateDriver);

// UPDATE DRIVER STATUS
// PATCH /api/users/drivers/:id/status
router.patch(
  "/drivers/:id/status",
  protect,
  allowRoles("ADMIN"),
  updateDriverStatus,
);

// Generic user status
router.patch("/:id/status", protect, allowRoles("ADMIN"), updateUserStatus);

module.exports = router;
