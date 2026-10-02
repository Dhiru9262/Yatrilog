const express = require("express");
const { getRevenue } = require("../controllers/revenueController");
const protect = require("../middleware/authMiddleware");
const allowRoles = require("../middleware/roleMiddleware");
const router = express.Router();
router.get("/", protect, allowRoles("OWNER", "AGENT"), getRevenue);
module.exports = router;
