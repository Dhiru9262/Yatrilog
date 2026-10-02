const express = require("express");

const {
  createRoute,
  createStop,
  getRoutes,
  getRoute,
  updateRoute,
  updateRouteStatus,
  getAllStops,
} = require("../controllers/routeController");

const protect = require("../middleware/authMiddleware");
const allowRoles = require("../middleware/roleMiddleware");

const router = express.Router();

// ======================================
// CREATE STOP
// ======================================

router.post("/stops", protect, allowRoles("ADMIN"), createStop);

// ======================================
// GET ALL STOPS
// ======================================

router.get("/stops", protect, getAllStops);

// ======================================
// CREATE ROUTE
// ======================================

router.post("/", protect, allowRoles("ADMIN"), createRoute);

// ======================================
// GET ALL ROUTES
// ======================================

router.get("/", protect, allowRoles("ADMIN", "OWNER"), getRoutes);

// ======================================
// GET ONE ROUTE
// ======================================

router.get("/:id", protect, allowRoles("ADMIN", "OWNER"), getRoute);

// ======================================
// UPDATE ROUTE
// ======================================

router.put("/:id", protect, allowRoles("ADMIN"), updateRoute);

// ======================================
// BLOCK / ACTIVATE ROUTE
// ======================================

router.patch("/:id/status", protect, allowRoles("ADMIN"), updateRouteStatus);

module.exports = router;
