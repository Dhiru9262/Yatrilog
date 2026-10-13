const express = require("express");
const { createOwnerAccount } = require("../controllers/ownerManagementController");
const protect = require("../middleware/authMiddleware");
const allowRoles = require("../middleware/roleMiddleware");

const router = express.Router();

// Only an authenticated owner can create another owner account.
router.post("/owners", protect, allowRoles("OWNER"), createOwnerAccount);

module.exports = router;
