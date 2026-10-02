const { getFareForTrip } = require("../services/routeFareService");
const Trip = require("../models/Trip");
const Fare = require("../models/Fare");
const { normalizeSeatLayout } = require("../services/vehicleSeatService");

// ======================================
// FIND STOP TIMING
// ======================================

const findStopTiming = (trip, stopId) => {
  if (!Array.isArray(trip.stopTimings) || trip.stopTimings.length === 0) {
    return null;
  }

  return trip.stopTimings.find(
    (timing) => timing.stop?.toString() === stopId.toString(),
  );
};

// ======================================
// GET STOP DEPARTURE
// ======================================

const getStopDepartureTime = (trip, stop) => {
  const timing = findStopTiming(trip, stop._id);

  if (timing?.departureTime) {
    return timing.departureTime;
  }

  if (timing?.arrivalTime) {
    return timing.arrivalTime;
  }

  // Backward compatibility
  return trip.departureTime;
};

// ======================================
// GET STOP ARRIVAL
// ======================================

const getStopArrivalTime = (trip, stop) => {
  const timing = findStopTiming(trip, stop._id);

  if (timing?.arrivalTime) {
    return timing.arrivalTime;
  }

  if (timing?.departureTime) {
    return timing.departureTime;
  }

  // Backward compatibility
  return trip.arrivalTime;
};

// ======================================
// BUILD COMPLETE STOP SCHEDULE
// ======================================

const buildStopSchedule = (trip) => {
  const routeStops = trip.route?.stops || [];

  return routeStops.map((stop) => {
    const timing = findStopTiming(trip, stop._id);

    return {
      stopId: stop._id,
      name: stop.name,
      sequence: stop.sequence,

      arrivalTime: timing?.arrivalTime || null,

      departureTime: timing?.departureTime || null,
    };
  });
};

// ======================================
// SEARCH TRIPS
// ======================================

const searchTrips = async (req, res) => {
  try {
    const { fromStop, toStop, date } = req.query;

    // ----------------------------------
    // Validate
    // ----------------------------------

    if (!fromStop || !toStop || !date) {
      return res.status(400).json({
        success: false,
        message: "fromStop, toStop and date are required",
      });
    }

    // ----------------------------------
    // Validate date
    // ----------------------------------

    const searchDate = new Date(date);

    if (isNaN(searchDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Invalid date",
      });
    }

    const today = new Date();

    today.setHours(0, 0, 0, 0);

    if (searchDate < today) {
      return res.status(400).json({
        success: false,
        message: "Cannot search trips for a past date",
      });
    }

    const startOfDay = new Date(date);

    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);

    endOfDay.setHours(23, 59, 59, 999);

    // ----------------------------------
    // Find trips
    // ----------------------------------

    const trips = await Trip.find({
      date: {
        $gte: startOfDay,
        $lte: endOfDay,
      },

      status: {
        $in: ["SCHEDULED"],
      },
    })
      .populate("route")
      .populate("vehicle", "vehicleNumber type totalSeats seatLayout")
      .populate("driver", "name")
      .sort({
        departureTime: 1,
      });

    const results = [];

    for (const trip of trips) {
      const stops = trip.route.stops;

      const requestedFromStop = fromStop.trim().toLowerCase();

      const requestedToStop = toStop.trim().toLowerCase();

      const boardingStop = stops.find(
        (stop) => stop.name.trim().toLowerCase() === requestedFromStop,
      );

      const droppingStop = stops.find(
        (stop) => stop.name.trim().toLowerCase() === requestedToStop,
      );

      if (!boardingStop || !droppingStop) {
        continue;
      }

      // FROM must be before TO
      if (boardingStop.sequence >= droppingStop.sequence) {
        continue;
      }

      // --------------------------------
      // Fare
      // --------------------------------

      const fare = await getFareForTrip(trip._id, boardingStop._id, droppingStop._id);

      if (!fare) {
        continue;
      }

      // --------------------------------
      // Customer-specific times
      // --------------------------------

      const customerDepartureTime = getStopDepartureTime(trip, boardingStop);

      const customerArrivalTime = getStopArrivalTime(trip, droppingStop);

      results.push({
        tripId: trip._id,

        route: {
          id: trip.route._id,
          name: trip.route.name,
        },

        boardingStop: {
          id: boardingStop._id,
          name: boardingStop.name,
          sequence: boardingStop.sequence,

          arrivalTime:
            findStopTiming(trip, boardingStop._id)?.arrivalTime || null,

          departureTime: customerDepartureTime,
        },

        droppingStop: {
          id: droppingStop._id,
          name: droppingStop.name,
          sequence: droppingStop.sequence,

          arrivalTime: customerArrivalTime,

          departureTime:
            findStopTiming(trip, droppingStop._id)?.departureTime || null,
        },

        vehicle: {
          id: trip.vehicle._id,
          vehicleNumber: trip.vehicle.vehicleNumber,
          type: trip.vehicle.type,
          totalSeats: trip.vehicle.totalSeats,
          seatLayout: normalizeSeatLayout(trip.vehicle.seatLayout, trip.vehicle.totalSeats),
        },

        driver: {
          name: trip.driver.name,
        },

        date: trip.date,

        // IMPORTANT:
        // These are now based on
        // customer's selected stops.
        departureTime: customerDepartureTime,

        arrivalTime: customerArrivalTime,

        // Overall trip times are also
        // returned for reference.
        tripDepartureTime: trip.departureTime,

        tripArrivalTime: trip.arrivalTime,

        stopSchedule: buildStopSchedule(trip),

        fare: fare.amount,

        status: trip.status,
      });
    }

    return res.status(200).json({
      success: true,
      count: results.length,
      trips: results,
    });
  } catch (error) {
    console.error("Search trips error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// ======================================
// GET CUSTOMER TRIP DETAILS
// ======================================

const getCustomerTripDetails = async (req, res) => {
  try {
    const { tripId } = req.params;

    const { fromStop, toStop } = req.query;

    if (!fromStop || !toStop) {
      return res.status(400).json({
        success: false,
        message: "fromStop and toStop are required",
      });
    }

    const trip = await Trip.findById(tripId)
      .populate("route")
      .populate("vehicle", "vehicleNumber type totalSeats seatLayout")
      .populate("driver", "name");

    if (!trip) {
      return res.status(404).json({
        success: false,
        message: "Trip not found",
      });
    }

    if (trip.status !== "SCHEDULED") {
      return res.status(400).json({
        success: false,
        message: "This trip is not available for booking",
      });
    }

    const boardingStop = trip.route.stops.find(
      (stop) => stop._id.toString() === fromStop.toString(),
    );

    const droppingStop = trip.route.stops.find(
      (stop) => stop._id.toString() === toStop.toString(),
    );

    if (!boardingStop || !droppingStop) {
      return res.status(400).json({
        success: false,
        message: "Invalid boarding or dropping stop",
      });
    }

    if (boardingStop.sequence >= droppingStop.sequence) {
      return res.status(400).json({
        success: false,
        message: "Invalid journey direction",
      });
    }

    const fare = await getFareForTrip(trip._id, boardingStop._id, droppingStop._id);

    if (!fare) {
      return res.status(404).json({
        success: false,
        message: "Fare is not configured for this journey",
      });
    }

    const boardingTiming = findStopTiming(trip, boardingStop._id);

    const droppingTiming = findStopTiming(trip, droppingStop._id);

    return res.status(200).json({
      success: true,

      trip: {
        id: trip._id,

        route: {
          id: trip.route._id,
          name: trip.route.name,
        },

        boardingStop: {
          id: boardingStop._id,
          name: boardingStop.name,
          sequence: boardingStop.sequence,

          arrivalTime: boardingTiming?.arrivalTime || null,

          departureTime: getStopDepartureTime(trip, boardingStop),
        },

        droppingStop: {
          id: droppingStop._id,
          name: droppingStop.name,
          sequence: droppingStop.sequence,

          arrivalTime: getStopArrivalTime(trip, droppingStop),

          departureTime: droppingTiming?.departureTime || null,
        },

        date: trip.date,

        departureTime: getStopDepartureTime(trip, boardingStop),

        arrivalTime: getStopArrivalTime(trip, droppingStop),

        tripDepartureTime: trip.departureTime,

        tripArrivalTime: trip.arrivalTime,

        stopSchedule: buildStopSchedule(trip),

        vehicle: {
          id: trip.vehicle._id,
          vehicleNumber: trip.vehicle.vehicleNumber,
          type: trip.vehicle.type,
          totalSeats: trip.vehicle.totalSeats,
          seatLayout: normalizeSeatLayout(trip.vehicle.seatLayout, trip.vehicle.totalSeats),
        },

        driver: {
          name: trip.driver.name,
        },

        fare: fare.amount,

        status: trip.status,
      },
    });
  } catch (error) {
    console.error("Get customer trip details error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

module.exports = {
  searchTrips,
  getCustomerTripDetails,
};
