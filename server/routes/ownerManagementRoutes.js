const express = require("express");
const { createOwnerAccount } = require("../controllers/ownerManagementController");
const protect = require("../middleware/authMiddleware");
const allowRoles = require("../middleware/roleMiddleware");

const router = express.Router();

// Only an authenticated admin can create owner accounts.
router.post("/owners", protect, allowRoles("ADMIN"), createOwnerAccount);

module.exports = router;
