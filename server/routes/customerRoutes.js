const express = require("express");

const {
  searchTrips,
  getCustomerTripDetails,
} = require("../controllers/customerController");

const protect = require("../middleware/authMiddleware");
const allowRoles = require("../middleware/roleMiddleware");

const router = express.Router();

// Search trips
router.get("/trips/search", protect, allowRoles("CUSTOMER"), searchTrips);

// Trip details
router.get(
  "/trips/:tripId",
  protect,
  allowRoles("CUSTOMER"),
  getCustomerTripDetails,
);

module.exports = router;
