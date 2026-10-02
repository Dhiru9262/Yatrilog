const Trip = require("../models/Trip");
const Booking = require("../models/Booking");

// ======================================
// GET MY ASSIGNED TRIPS
// ======================================

const getMyTrips = async (req, res) => {
  try {
    const trips = await Trip.find({
      driver: req.user.id,
    })
      .populate("route")
      .populate("vehicle", "vehicleNumber type totalSeats seatLayout")
      .sort({
        date: 1,
        departureTime: 1,
      });

    const result = trips.map((trip) => ({
      id: trip._id,

      status: trip.status,

      date: trip.date,

      departureTime: trip.departureTime,

      arrivalTime: trip.arrivalTime,

      route: {
        id: trip.route._id,

        name: trip.route.name,
      },

      vehicle: {
        vehicleNumber: trip.vehicle.vehicleNumber,

        type: trip.vehicle.type,

        totalSeats: trip.vehicle.totalSeats,
        seatLayout: trip.vehicle.seatLayout || null,
      },
    }));

    res.status(200).json({
      success: true,
      count: result.length,
      trips: result,
    });
  } catch (error) {
    console.error("Get driver trips error:", error);

    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// ======================================
// GET PASSENGERS FOR MY TRIP
// ======================================

const getTripPassengers = async (req, res) => {
  try {
    const { tripId } = req.params;

    // ----------------------------------
    // Verify trip belongs to driver
    // ----------------------------------

    const trip = await Trip.findOne({
      _id: tripId,
      driver: req.user.id,
    })
      .populate("route")
      .populate("vehicle", "vehicleNumber type totalSeats seatLayout");

    if (!trip) {
      return res.status(404).json({
        success: false,
        message: "Trip not found or not assigned to you",
      });
    }

    // ----------------------------------
    // Get confirmed bookings only
    // ----------------------------------

    const bookings = await Booking.find({
      trip: tripId,

      status: "CONFIRMED",

      paymentStatus: "PAID",
    })
      .populate("customer", "name email phone")
      .sort({
        seatNumber: 1,
      });

    const passengers = bookings.map((booking) => {
      const boardingStop = trip.route.stops.find(
        (stop) => stop._id.toString() === booking.boardingStop.toString(),
      );

      const droppingStop = trip.route.stops.find(
        (stop) => stop._id.toString() === booking.droppingStop.toString(),
      );

      return {
        bookingNumber: booking.bookingNumber,

        passenger: {
          id: booking.customer._id,

          name: booking.customer.name,

          phone: booking.customer.phone,

          email: booking.customer.email,
        },

        seatNumber: booking.seatNumber,

        boardingStop: boardingStop ? boardingStop.name : null,

        droppingStop: droppingStop ? droppingStop.name : null,

        boardingSequence: booking.boardingSequence,

        droppingSequence: booking.droppingSequence,

        fare: booking.fare,

        bookingStatus: booking.status,
      };
    });

    res.status(200).json({
      success: true,

      trip: {
        id: trip._id,

        date: trip.date,

        departureTime: trip.departureTime,

        arrivalTime: trip.arrivalTime,

        route: {
          id: trip.route._id,

          name: trip.route.name,
        },

        vehicle: {
          vehicleNumber: trip.vehicle.vehicleNumber,

          type: trip.vehicle.type,

          totalSeats: trip.vehicle.totalSeats,
          seatLayout: trip.vehicle.seatLayout || null,
        },
      },

      count: passengers.length,

      passengers,
    });
  } catch (error) {
    console.error("Get trip passengers error:", error);

    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

module.exports = {
  getMyTrips,
  getTripPassengers,
};
