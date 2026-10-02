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

const getDailyBookings = async (req, res) => {
  try {
    const range = getDayRange(req.query.date);
    if (!range) {
      return res.status(400).json({ success: false, message: "Invalid date" });
    }

    const { route, vehicle } = req.query;

    let tripFilter = {
      date: { $gte: range.start, $lt: range.end },
    };

    // Optional filters used by owner/driver/admin booking views.
    // Route and vehicle are applied at the trip level so the booking list,
    // grouping and summary all stay consistent with the selected filters.
    if (route) tripFilter.route = route;
    if (vehicle) tripFilter.vehicle = vehicle;

    if (req.user.role === "AGENT") {
      tripFilter.driver = req.user.id;
    } else if (req.user.role === "OWNER") {
      const vehicles = await Vehicle.find({ owner: req.user.id }).select("_id");
      tripFilter.vehicle = { $in: vehicles.map((v) => v._id) };
    }

    const trips = await Trip.find(tripFilter)
      .populate("route")
      .populate("vehicle", "vehicleNumber type totalSeats owner")
      .populate("driver", "name email phone")
      .sort({ departureTime: 1 });

    const tripIds = trips.map((trip) => trip._id);
    const bookings = await Booking.find({
      trip: { $in: tripIds },
      status: { $in: ["PENDING", "CONFIRMED", "CANCELLED", "EXPIRED"] },
    })
      .populate("customer", "name email phone")
      .populate("bookedBy", "name email phone role")
      .sort({ createdAt: -1, seatNumber: 1 });

    const stopName = (trip, id) =>
      trip.route?.stops?.find((stop) => String(stop._id) === String(id))?.name || null;

    const tripMap = new Map(trips.map((trip) => [String(trip._id), trip]));

    const formatted = bookings.map((booking) => {
      const trip = tripMap.get(String(booking.trip));
      const passenger = booking.bookingType === "OFFLINE"
        ? {
            name: booking.passengerName,
            phone: booking.passengerPhone,
            email: booking.passengerEmail,
          }
        : {
            name: booking.customer?.name || null,
            phone: booking.customer?.phone || null,
            email: booking.customer?.email || null,
          };

      return {
        id: booking._id,
        bookingNumber: booking.bookingNumber,
        passenger,
        seatNumber: booking.seatNumber,
        boardingStop: stopName(trip, booking.boardingStop),
        droppingStop: stopName(trip, booking.droppingStop),
        boardingSequence: booking.boardingSequence,
        droppingSequence: booking.droppingSequence,
        fare: booking.fare,
        status: booking.status,
        paymentStatus: booking.paymentStatus,
        bookingType: booking.bookingType,
        paymentMethod: booking.paymentMethod,
        bookedBy: booking.bookedBy
          ? {
              name: booking.bookedBy.name,
              role: booking.bookedBy.role,
              email: booking.bookedBy.email,
            }
          : booking.bookedByDriver
            ? { name: "Driver", role: "AGENT" }
            : null,
        createdAt: booking.createdAt,
        trip: trip
          ? {
              id: trip._id,
              routeId: trip.route?._id || null,
              route: trip.route?.name || "Unknown route",
              date: trip.date,
              departureTime: trip.departureTime,
              arrivalTime: trip.arrivalTime,
              vehicleId: trip.vehicle?._id || null,
              vehicleNumber: trip.vehicle?.vehicleNumber,
              driver: trip.driver?.name || null,
            }
          : null,
      };
    });

    const summary = {
      trips: trips.length,
      bookings: formatted.length,
      confirmed: formatted.filter((b) => b.status === "CONFIRMED").length,
      cancelled: formatted.filter((b) => b.status === "CANCELLED").length,
      pending: formatted.filter((b) => b.status === "PENDING").length,
      seatsBooked: formatted.filter((b) => b.status === "CONFIRMED").length,
      revenue: formatted
        .filter((b) => b.status === "CONFIRMED" && b.paymentStatus === "PAID")
        .reduce((sum, b) => sum + Number(b.fare || 0), 0),
    };

    return res.json({
      success: true,
      date: range.start.toISOString().slice(0, 10),
      summary,
      bookings: formatted,
    });
  } catch (error) {
    console.error("Daily bookings error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

module.exports = { getDailyBookings };
