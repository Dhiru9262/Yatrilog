const Trip = require("../models/Trip");
const Booking = require("../models/Booking");
const Vehicle = require("../models/Vehicle");

const getDayRange = (value) => {
  if (!value) return null;
  const base = new Date(`${value}T00:00:00`);
  if (Number.isNaN(base.getTime())) return null;
  const start = new Date(base);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
};

const getVehicleBookings = async (req, res) => {
  try {
    const vehicle = await Vehicle.findById(req.params.vehicleId).populate("owner", "name email");
    if (!vehicle) return res.status(404).json({ success: false, message: "Vehicle not found" });
    if (req.user.role === "OWNER" && String(vehicle.owner?._id) !== String(req.user.id)) {
      return res.status(403).json({ success: false, message: "You can only view your own vehicle bookings" });
    }

    const tripFilter = { vehicle: vehicle._id };
    if (req.user.role === "AGENT") tripFilter.driver = req.user.id;
    if (req.query.date) {
      const range = getDayRange(req.query.date);
      if (!range) return res.status(400).json({ success: false, message: "Invalid date" });
      tripFilter.date = { $gte: range.start, $lt: range.end };
    }

    const trips = await Trip.find(tripFilter)
      .populate("route")
      .populate("driver", "name email phone")
      .sort({ date: -1, departureTime: 1 });
    const tripIds = trips.map((trip) => trip._id);
    const bookings = await Booking.find({ trip: { $in: tripIds } })
      .populate("customer", "name email phone")
      .populate("bookedBy", "name role")
      .sort({ createdAt: -1, seatNumber: 1 });

    const tripMap = new Map(trips.map((trip) => [String(trip._id), trip]));
    const result = bookings.map((booking) => {
      const trip = tripMap.get(String(booking.trip));
      const passenger = booking.bookingType === "OFFLINE"
        ? { name: booking.passengerName, phone: booking.passengerPhone, email: booking.passengerEmail }
        : { name: booking.customer?.name, phone: booking.customer?.phone, email: booking.customer?.email };
      const stopName = (id) => trip?.route?.stops?.find((stop) => String(stop._id) === String(id))?.name || "-";
      return {
        id: booking._id,
        bookingNumber: booking.bookingNumber,
        passenger,
        seatNumber: booking.seatNumber,
        boardingStop: stopName(booking.boardingStop),
        droppingStop: stopName(booking.droppingStop),
        fare: booking.fare,
        status: booking.status,
        paymentStatus: booking.paymentStatus,
        bookingType: booking.bookingType,
        date: trip?.date,
        tripId: trip?._id,
        route: trip?.route?.name || "Unknown route",
        driver: trip?.driver?.name || "-",
      };
    });

    return res.json({
      success: true,
      vehicle: { id: vehicle._id, vehicleNumber: vehicle.vehicleNumber, type: vehicle.type, totalSeats: vehicle.totalSeats, status: vehicle.status },
      trips: trips.map((trip) => ({ id: trip._id, date: trip.date, route: trip.route?.name || "Unknown route", departureTime: trip.departureTime, arrivalTime: trip.arrivalTime, driver: trip.driver?.name || "-" })),
      bookings: result,
      summary: {
        bookings: result.length,
        confirmed: result.filter((b) => b.status === "CONFIRMED").length,
        revenue: result.filter((b) => b.status === "CONFIRMED" && b.paymentStatus === "PAID").reduce((sum, b) => sum + Number(b.fare || 0), 0),
      },
    });
  } catch (error) {
    console.error("Vehicle bookings error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

module.exports = { getVehicleBookings };
