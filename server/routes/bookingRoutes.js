const express = require("express");

const { createBooking } = require("../controllers/bookingController");
const { cancelBooking } = require("../controllers/bookingController");

const protect = require("../middleware/authMiddleware");
const allowRoles = require("../middleware/roleMiddleware");

const router = express.Router();

router.post("/", protect, allowRoles("CUSTOMER"), createBooking);
router.patch("/:bookingId/cancel", protect, cancelBooking);

module.exports = router;
