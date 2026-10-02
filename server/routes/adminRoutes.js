const express = require("express");

const {
  createOwner,
  getOwners,
  getOwner,
  updateOwner,
  updateOwnerStatus,

  createDriver,
  getDrivers,
  getDriver,
  updateDriver,
  updateDriverStatus,
} = require("../controllers/adminController");

const protect = require("../middleware/authMiddleware");
const allowRoles = require("../middleware/roleMiddleware");

const router = express.Router();

// Owner management

router.post("/owners", protect, allowRoles("ADMIN"), createOwner);

router.get("/owners", protect, allowRoles("ADMIN"), getOwners);

router.get("/owners/:id", protect, allowRoles("ADMIN"), getOwner);

router.put("/owners/:id", protect, allowRoles("ADMIN"), updateOwner);

router.patch(
  "/owners/:id/status",
  protect,
  allowRoles("ADMIN"),
  updateOwnerStatus,
);

// =========================
// DRIVER MANAGEMENT
// =========================

router.post("/drivers", protect, allowRoles("ADMIN"), createDriver);

router.get("/drivers", protect, allowRoles("ADMIN"), getDrivers);

router.get("/drivers/:id", protect, allowRoles("ADMIN"), getDriver);

router.put("/drivers/:id", protect, allowRoles("ADMIN"), updateDriver);

router.patch(
  "/drivers/:id/status",
  protect,
  allowRoles("ADMIN"),
  updateDriverStatus,
);
module.exports = router;
