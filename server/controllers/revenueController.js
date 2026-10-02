const Trip = require("../models/Trip");
const Booking = require("../models/Booking");
const Vehicle = require("../models/Vehicle");

const getDayRange = (value) => {
  const base = value ? new Date(`${value}T00:00:00`) : new Date();
  if (Number.isNaN(base.getTime())) return null;
  const start = new Date(base);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
};

const getRevenue = async (req, res) => {
  try {
    const range = getDayRange(req.query.date);
    if (!range) return res.status(400).json({ success: false, message: "Invalid date" });

    const vehicleId = req.query.vehicle;
    const tripFilter = { date: { $gte: range.start, $lt: range.end } };

    if (req.user.role === "OWNER") {
      const ownerVehicles = await Vehicle.find({ owner: req.user.id }).select("_id vehicleNumber type");
      const ids = ownerVehicles.map((v) => String(v._id));
      if (vehicleId) {
        if (!ids.includes(String(vehicleId))) return res.status(403).json({ success: false, message: "Vehicle does not belong to you" });
        tripFilter.vehicle = vehicleId;
      } else {
        tripFilter.vehicle = { $in: ownerVehicles.map((v) => v._id) };
      }
    } else if (req.user.role === "AGENT") {
      tripFilter.driver = req.user.id;
      if (vehicleId) tripFilter.vehicle = vehicleId;
    }

    const trips = await Trip.find(tripFilter)
      .populate("vehicle", "vehicleNumber type totalSeats")
      .populate("route", "name")
      .sort({ departureTime: 1 });

    const tripIds = trips.map((t) => t._id);
    const bookings = await Booking.find({
      trip: { $in: tripIds },
      status: "CONFIRMED",
      paymentStatus: "PAID",
    }).select("trip fare status paymentStatus");

    const tripMap = new Map(trips.map((t) => [String(t._id), t]));
    const vehicleMap = new Map();
    for (const booking of bookings) {
      const trip = tripMap.get(String(booking.trip));
      if (!trip?.vehicle) continue;
      const key = String(trip.vehicle._id);
      const current = vehicleMap.get(key) || {
        vehicleId: trip.vehicle._id,
        vehicleNumber: trip.vehicle.vehicleNumber,
        type: trip.vehicle.type,
        bookings: 0,
        revenue: 0,
      };
      current.bookings += 1;
      current.revenue += Number(booking.fare || 0);
      vehicleMap.set(key, current);
    }

    const tripsResult = trips.map((trip) => {
      const tripBookings = bookings.filter((b) => String(b.trip) === String(trip._id));
      return {
        tripId: trip._id,
        route: trip.route?.name || "Unknown route",
        vehicleId: trip.vehicle?._id || null,
        vehicleNumber: trip.vehicle?.vehicleNumber || "-",
        departureTime: trip.departureTime,
        arrivalTime: trip.arrivalTime,
        bookings: tripBookings.length,
        revenue: tripBookings.reduce((sum, b) => sum + Number(b.fare || 0), 0),
      };
    });

    return res.json({
      success: true,
      date: range.start.toISOString().slice(0, 10),
      summary: {
        trips: trips.length,
        bookings: bookings.length,
        revenue: bookings.reduce((sum, b) => sum + Number(b.fare || 0), 0),
      },
      vehicles: Array.from(vehicleMap.values()).sort((a, b) => String(a.vehicleNumber).localeCompare(String(b.vehicleNumber))),
      trips: tripsResult,
    });
  } catch (error) {
    console.error("Revenue error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

module.exports = { getRevenue };
