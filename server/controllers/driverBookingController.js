const { getFareForTrip } = require("../services/routeFareService");
const mongoose = require("mongoose");

const Trip = require("../models/Trip");
const Booking = require("../models/Booking");
const Fare = require("../models/Fare");

const { isSeatAvailable } = require("../services/seatService");

const generateBookingNumber = require("../utils/generateBookingNumber");

const { emitSeatUpdate } = require("../socket/seatSocket");

// ======================================
// MY ASSIGNED TRIPS
// ======================================

const getMyTrips = async (req, res) => {
  try {
    const trips = await Trip.find({
      driver: req.user.id,
    })
      .populate("route")
      .populate("vehicle", "vehicleNumber type totalSeats")
      .sort({
        date: 1,
      });

    const result = trips.map((trip) => ({
      tripId: trip._id,

      date: trip.date,

      departureTime: trip.departureTime,

      arrivalTime: trip.arrivalTime,

      status: trip.status,

      isRunning: trip.isRunning !== false,

      route: trip.route
        ? {
            id: trip.route._id,
            name: trip.route.name,
            stops: trip.route.stops,
          }
        : null,

      vehicle: trip.vehicle
        ? {
            id: trip.vehicle._id,
            vehicleNumber: trip.vehicle.vehicleNumber,

            type: trip.vehicle.type,

            totalSeats: trip.vehicle.totalSeats,
          }
        : null,
    }));

    return res.status(200).json({
      success: true,
      count: result.length,
      trips: result,
    });
  } catch (error) {
    console.error("Get assigned trips error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// ======================================
// PASSENGERS OF ASSIGNED TRIP
// ======================================

const getTripPassengers = async (req, res) => {
  try {
    const { tripId } = req.params;

    const trip = await Trip.findOne({
      _id: tripId,
      driver: req.user.id,
    })
      .populate("route")
      .populate("vehicle", "vehicleNumber type totalSeats");

    if (!trip) {
      return res.status(404).json({
        success: false,
        message: "Trip not found or not assigned to you",
      });
    }

    const bookings = await Booking.find({
      trip: tripId,
      status: "CONFIRMED",
    })
      .populate("customer", "name email phone")
      .sort({
        createdAt: -1,
        seatNumber: 1,
      });

    const passengers = bookings.map((booking) => ({
      id: booking._id,

      bookingNumber: booking.bookingNumber,

      passenger: {
        name:
          booking.bookingType === "OFFLINE"
            ? booking.passengerName
            : booking.customer?.name,

        phone:
          booking.bookingType === "OFFLINE"
            ? booking.passengerPhone
            : booking.customer?.phone,

        email:
          booking.bookingType === "OFFLINE"
            ? booking.passengerEmail
            : booking.customer?.email,
      },

      seatNumber: booking.seatNumber,

      boardingStop: trip.route?.stops?.find(
        (stop) => String(stop._id) === String(booking.boardingStop),
      )?.name,

      droppingStop: trip.route?.stops?.find(
        (stop) => String(stop._id) === String(booking.droppingStop),
      )?.name,

      fare: booking.fare,

      status: booking.status,

      bookingType: booking.bookingType,

      paymentMethod: booking.paymentMethod,
    }));

    return res.status(200).json({
      success: true,

      trip: {
        id: trip._id,

        route: trip.route
          ? {
              id: trip.route._id,
              name: trip.route.name,
            }
          : null,

        date: trip.date,

        departureTime: trip.departureTime,

        arrivalTime: trip.arrivalTime,

        vehicleNumber: trip.vehicle?.vehicleNumber,

        totalSeats: trip.vehicle?.totalSeats,
      },

      count: passengers.length,

      passengers,
    });
  } catch (error) {
    console.error("Get trip passengers error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// ======================================
// CREATE MULTI-SEAT OFFLINE BOOKING
// ======================================

const createOfflineBooking = async (req, res) => {
  try {
    const { tripId } = req.params;

    const {
      passengerName,
      passengerPhone,
      passengerEmail,
      boardingStop,
      droppingStop,
      seatNumbers,
      paymentMethod = "CASH",
    } = req.body;

    // ======================================
    // VALIDATE PASSENGER
    // ======================================

    // Passenger contact fields are optional for owner/driver bookings.
    // Store null when the operator does not have the passenger details.
    const normalizedPassengerName = passengerName?.trim() || null;
    const normalizedPassengerPhone = passengerPhone?.trim() || null;
    const normalizedPassengerEmail = passengerEmail?.trim().toLowerCase() || null;

    // ======================================
    // VALIDATE JOURNEY
    // ======================================

    if (!boardingStop || !droppingStop) {
      return res.status(400).json({
        success: false,
        message: "Boarding and dropping stops are required",
      });
    }

    // ======================================
    // NORMALIZE SEATS
    // ======================================

    const requestedSeats = Array.isArray(seatNumbers) ? seatNumbers : [];

    const normalizedSeats = [
      ...new Set(requestedSeats.map((seat) => String(seat).trim())),
    ];

    if (normalizedSeats.length === 0) {
      return res.status(400).json({
        success: false,
        message: "At least one seat must be selected",
      });
    }

    // ======================================
    // PAYMENT METHOD
    // ======================================

    if (!["CASH", "COUNTER"].includes(paymentMethod)) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment method",
      });
    }

    // ======================================
    // GET TRIP
    // ======================================

    const trip = await Trip.findById(tripId)
      .populate("route")
      .populate("vehicle");

    if (!trip) {
      return res.status(404).json({
        success: false,
        message: "Trip not found",
      });
    }

    const isDriver = req.user.role === "AGENT" &&
      String(trip.driver) === String(req.user.id);
    const isOwner = req.user.role === "OWNER" &&
      trip.vehicle &&
      String(trip.vehicle.owner) === String(req.user.id);

    if (!isDriver && !isOwner) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to create a booking for this trip",
      });
    }

    // ======================================
    // TRIP STATUS
    // ======================================

    if (trip.status !== "SCHEDULED") {
      return res.status(400).json({
        success: false,
        message: "Offline booking is available only for scheduled trips",
      });
    }

    // ======================================
    // FIND STOPS
    // ======================================

    const fromStop = trip.route.stops.find(
      (stop) => String(stop._id) === String(boardingStop),
    );

    const toStop = trip.route.stops.find(
      (stop) => String(stop._id) === String(droppingStop),
    );

    if (!fromStop || !toStop) {
      return res.status(400).json({
        success: false,
        message: "Invalid boarding or dropping stop",
      });
    }

    // ======================================
    // VALIDATE DIRECTION
    // ======================================

    if (fromStop.sequence >= toStop.sequence) {
      return res.status(400).json({
        success: false,
        message: "Boarding stop must come before dropping stop",
      });
    }

    // ======================================
    // VALIDATE SEAT NUMBERS
    // ======================================

    for (const seatNumber of normalizedSeats) {
      const seat = Number(seatNumber);

      if (
        !Number.isInteger(seat) ||
        seat < 1 ||
        seat > trip.vehicle.totalSeats
      ) {
        return res.status(400).json({
          success: false,
          message: `Invalid seat number: ${seatNumber}`,
        });
      }
    }

    // ======================================
    // GET FARE
    // ======================================

    const fare = await getFareForTrip(tripId, fromStop._id, toStop._id);

    if (!fare) {
      return res.status(400).json({
        success: false,
        message: "Fare is not configured for this journey",
      });
    }

    // ======================================
    // CHECK ALL SEATS BEFORE CREATING ANY
    // ======================================

    for (const seatNumber of normalizedSeats) {
      const available = await isSeatAvailable(
        tripId,
        seatNumber,
        fromStop.sequence,
        toStop.sequence,
      );

      if (!available) {
        return res.status(409).json({
          success: false,
          message: `Seat ${seatNumber} is no longer available for this journey segment`,
        });
      }
    }

    // ======================================
    // CREATE BOOKINGS
    // ======================================

    const bookingDocuments = normalizedSeats.map((seatNumber) => ({
      bookingNumber: generateBookingNumber(),

      customer: null,

      bookedByDriver: isDriver ? req.user.id : null,

      bookedBy: req.user.id,

      passengerName: passengerName.trim(),

      passengerPhone: passengerPhone.trim(),

      passengerEmail: passengerEmail?.trim() || null,

      trip: tripId,

      seatNumber,

      boardingStop: fromStop._id,

      droppingStop: toStop._id,

      boardingSequence: fromStop.sequence,

      droppingSequence: toStop.sequence,

      fare: fare.amount,

      status: "CONFIRMED",

      paymentStatus: "PAID",

      bookingType: "OFFLINE",

      paymentMethod,
    }));

    /*
     * ordered:true is important when using
     * multiple documents with Mongoose.
     */

    const createdBookings = await Booking.create(bookingDocuments);

    // ======================================
    // EMIT SEAT UPDATE FOR EVERY SEAT
    // ======================================

    for (const booking of createdBookings) {
      emitSeatUpdate({
        tripId,

        seatNumber: booking.seatNumber,

        status: "BOOKED",

        boardingSequence: booking.boardingSequence,

        droppingSequence: booking.droppingSequence,
      });
    }

    // ======================================
    // TOTAL
    // ======================================

    const totalFare = createdBookings.reduce(
      (total, booking) => total + Number(booking.fare || 0),
      0,
    );

    // ======================================
    // RESPONSE
    // ======================================

    return res.status(201).json({
      success: true,

      message: "Offline booking created successfully",

      booking: {
        passengerName: passengerName.trim(),

        passengerPhone: passengerPhone.trim(),

        passengerEmail: passengerEmail?.trim() || null,

        bookings: createdBookings.map((booking) => ({
          id: booking._id,

          bookingNumber: booking.bookingNumber,

          seatNumber: booking.seatNumber,

          fare: booking.fare,

          status: booking.status,

          paymentStatus: booking.paymentStatus,

          bookingType: booking.bookingType,

          paymentMethod: booking.paymentMethod,
        })),

        totalSeats: createdBookings.length,

        totalFare,

        boardingStop: {
          id: fromStop._id,
          name: fromStop.name,
        },

        droppingStop: {
          id: toStop._id,
          name: toStop.name,
        },
      },
    });
  } catch (error) {
    console.error("Create offline booking error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// ======================================
// CANCEL DRIVER'S OWN OFFLINE BOOKING
// ======================================

const cancelDriverBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;

    // ======================================
    // FIND ONLY THIS DRIVER'S BOOKING
    // ======================================

    const booking = await Booking.findOne({
      _id: bookingId,

      // The creator may cancel only their own offline booking.
      $or: [
        { bookedBy: req.user.id },
        { bookedByDriver: req.user.id },
      ],

      bookingType: "OFFLINE",
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found or this ticket was not created by you",
      });
    }

    // ======================================
    // CHECK STATUS
    // ======================================

    if (booking.status !== "CONFIRMED") {
      return res.status(400).json({
        success: false,
        message: "Only confirmed bookings can be cancelled",
      });
    }

    // ======================================
    // GET TRIP
    // ======================================

    const trip = await Trip.findById(booking.trip);

    if (!trip) {
      return res.status(404).json({
        success: false,
        message: "Trip not found",
      });
    }

    // ======================================
    // 1 HOUR CANCELLATION RULE
    // ======================================

    const departureDateTime = new Date(trip.date);

    if (trip.departureTime) {
      const time = trip.departureTime.trim().toUpperCase();

      let hours;
      let minutes;

      // Supports 24-hour format: 14:30
      if (/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) {
        [hours, minutes] = time.split(":").map(Number);
      } else {
        // Supports 12-hour format: 02:30 PM
        const match = time.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/);

        if (match) {
          hours = Number(match[1]);
          minutes = Number(match[2]);

          const period = match[3];

          if (period === "PM" && hours !== 12) {
            hours += 12;
          }

          if (period === "AM" && hours === 12) {
            hours = 0;
          }
        }
      }

      if (hours !== undefined && minutes !== undefined) {
        departureDateTime.setHours(hours, minutes, 0, 0);
      }
    }

    const cutoffMinutes = Number(process.env.CANCELLATION_CUTOFF_MINUTES) || 60;

    const cutoffTime = new Date(
      departureDateTime.getTime() - cutoffMinutes * 60 * 1000,
    );

    const now = new Date();

    if (now >= cutoffTime) {
      return res.status(400).json({
        success: false,
        message:
          "This ticket cannot be cancelled because departure is less than 1 hour away",
      });
    }

    // ======================================
    // CANCEL BOOKING
    // ======================================

    booking.status = "CANCELLED";

    booking.cancelledAt = new Date();

    /*
     * Offline booking:
     *
     * CASH / COUNTER payments are not
     * automatically refunded through Razorpay.
     *
     * Therefore we do NOT create a Razorpay refund.
     */

    await booking.save();

    // ======================================
    // RELEASE SEAT THROUGH SOCKET
    // ======================================

    emitSeatUpdate({
      tripId: booking.trip,

      seatNumber: booking.seatNumber,

      status: "AVAILABLE",

      boardingSequence: booking.boardingSequence,

      droppingSequence: booking.droppingSequence,
    });

    // ======================================
    // RESPONSE
    // ======================================

    return res.status(200).json({
      success: true,

      message: "Your offline ticket has been cancelled successfully",

      booking: {
        id: booking._id,

        bookingNumber: booking.bookingNumber,

        seatNumber: booking.seatNumber,

        status: booking.status,

        cancelledAt: booking.cancelledAt,
      },
    });
  } catch (error) {
    console.error("Cancel driver booking error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Unable to cancel booking",
    });
  }
};

module.exports = {
  getMyTrips,
  getTripPassengers,
  createOfflineBooking,
  cancelDriverBooking,
};
