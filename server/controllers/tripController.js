const { isRouteConfigured } = require("../services/routeFareService");
const Trip = require("../models/Trip");
const Route = require("../models/Route");
const Vehicle = require("../models/Vehicle");
const User = require("../models/User");
const Booking = require("../models/Booking");
const SeatLock = require("../models/SeatLock");

const { generateSeatNumbers, normalizeSeatLayout } = require("../services/vehicleSeatService");

const { segmentsOverlap } = require("../services/seatLockService");

const { timeToMinutes, timesOverlap } = require("../utils/timeUtils");

// ======================================
// TIME HELPERS
// ======================================

const normalizeTime = (value) => {
  if (!value) {
    return null;
  }

  const valueString = String(value).trim();

  if (/^\d{2}:\d{2}$/.test(valueString)) {
    return valueString;
  }

  const match = valueString.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);

  if (!match) {
    return null;
  }

  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  const period = match[3].toUpperCase();

  if (hours < 1 || hours > 12 || minutes < 0 || minutes > 59) {
    return null;
  }

  if (period === "AM") {
    if (hours === 12) {
      hours = 0;
    }
  } else if (hours !== 12) {
    hours += 12;
  }

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(
    2,
    "0",
  )}`;
};

// ======================================
// BUILD STOP TIMINGS
// ======================================

const buildStopTimings = ({
  routeData,
  stopTimings,
  departureTime,
  arrivalTime,
}) => {
  if (!routeData?.stops?.length) {
    return {
      error: "Route has no stops",
    };
  }

  if (!Array.isArray(stopTimings)) {
    return {
      error: "stopTimings must be an array",
    };
  }

  if (stopTimings.length !== routeData.stops.length) {
    return {
      error: "A timing must be provided for every stop in the route",
    };
  }

  const timingMap = new Map();

  for (const item of stopTimings) {
    if (!item?.stop) {
      return {
        error: "Every stop timing must contain a stop",
      };
    }

    const stopId = String(item.stop);

    if (timingMap.has(stopId)) {
      return {
        error: "Duplicate stop timing found",
      };
    }

    timingMap.set(stopId, item);
  }

  const formatted = [];

  let previousDepartureMinutes = null;

  for (let index = 0; index < routeData.stops.length; index += 1) {
    const routeStop = routeData.stops[index];

    const item = timingMap.get(routeStop._id.toString());

    if (!item) {
      return {
        error: `Timing missing for stop: ${routeStop.name}`,
      };
    }

    let arrival = normalizeTime(item.arrivalTime);
    let departure = normalizeTime(item.departureTime);

    // First stop
    if (index === 0) {
      if (!departure) {
        return {
          error: `Departure time is required for first stop: ${routeStop.name}`,
        };
      }

      arrival = null;
    }

    // Last stop
    if (index === routeData.stops.length - 1) {
      if (!arrival) {
        return {
          error: `Arrival time is required for last stop: ${routeStop.name}`,
        };
      }

      departure = null;
    }

    // Middle stops
    if (index > 0 && index < routeData.stops.length - 1) {
      if (!arrival || !departure) {
        return {
          error: `Arrival and departure time are required for stop: ${routeStop.name}`,
        };
      }
    }

    if (arrival && departure) {
      const arrivalMinutes = timeToMinutes(arrival);
      const departureMinutes = timeToMinutes(departure);

      if (arrivalMinutes === null || departureMinutes === null) {
        return {
          error: `Invalid time for stop: ${routeStop.name}`,
        };
      }

      if (arrivalMinutes > departureMinutes) {
        return {
          error: `Departure time cannot be before arrival time at ${routeStop.name}`,
        };
      }
    }

    const effectiveArrival = arrival || departure;

    const effectiveDeparture = departure || arrival;

    const effectiveMinutes = timeToMinutes(effectiveDeparture);

    if (effectiveMinutes === null) {
      return {
        error: `Invalid timing for stop: ${routeStop.name}`,
      };
    }

    if (
      previousDepartureMinutes !== null &&
      effectiveMinutes < previousDepartureMinutes
    ) {
      return {
        error: `Stop times must be in chronological order. Check ${routeStop.name}`,
      };
    }

    previousDepartureMinutes = effectiveMinutes;

    formatted.push({
      stop: routeStop._id,
      arrivalTime: arrival,
      departureTime: departure,
    });
  }

  // ======================================
  // FIRST STOP MUST MATCH TRIP DEPARTURE
  // ======================================

  const firstTiming = formatted[0];

  const lastTiming = formatted[formatted.length - 1];

  const normalizedTripDeparture = normalizeTime(departureTime);

  const normalizedTripArrival = normalizeTime(arrivalTime);

  if (
    normalizedTripDeparture &&
    firstTiming.departureTime !== normalizedTripDeparture
  ) {
    return {
      error: "First stop departure time must match trip departure time",
    };
  }

  if (
    normalizedTripArrival &&
    lastTiming.arrivalTime !== normalizedTripArrival
  ) {
    return {
      error: "Last stop arrival time must match trip arrival time",
    };
  }

  return {
    stopTimings: formatted,
  };
};

// ======================================
// CREATE TRIP
// ======================================

const createTrip = async (req, res) => {
  try {
    const {
      route,
      vehicle,
      driver,
      date,
      departureTime,
      arrivalTime,
      stopTimings,
      isDailySchedule = false,
      scheduleEndDate,
    } = req.body;

    // ----------------------------------
    // Basic validation
    // ----------------------------------

    if (
      !route ||
      !vehicle ||
      !driver ||
      !date ||
      !departureTime ||
      !arrivalTime
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Route, vehicle, driver, date, departure time and arrival time are required",
      });
    }

    const departureMinutes = timeToMinutes(departureTime);

    const arrivalMinutes = timeToMinutes(arrivalTime);

    if (departureMinutes === null || arrivalMinutes === null) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid departure or arrival time. Use formats like 10:00 AM or 22:00",
      });
    }

    if (departureMinutes >= arrivalMinutes) {
      return res.status(400).json({
        success: false,
        message: "Arrival time must be after departure time",
      });
    }

    // ----------------------------------
    // Check route
    // ----------------------------------

    const routeData = await Route.findById(route);

    if (!routeData) {
      return res.status(404).json({
        success: false,
        message: "Route not found",
      });
    }

    if (routeData.status !== "ACTIVE") {
      return res.status(400).json({
        success: false,
        message: "Route is not active",
      });
    }

    // ----------------------------------
    // Validate stop timings
    // ----------------------------------

    const timingResult = buildStopTimings({
      routeData,
      stopTimings,
      departureTime,
      arrivalTime,
    });

    if (timingResult.error) {
      return res.status(400).json({
        success: false,
        message: timingResult.error,
      });
    }

    // ----------------------------------
    // Check vehicle
    // ----------------------------------

    const vehicleData = await Vehicle.findById(vehicle);

    if (!vehicleData) {
      return res.status(404).json({
        success: false,
        message: "Vehicle not found",
      });
    }

    if (vehicleData.status !== "ACTIVE") {
      return res.status(400).json({
        success: false,
        message: "Vehicle is not active",
      });
    }

    // ----------------------------------
    // Check driver
    // ----------------------------------

    const driverData = await User.findOne({
      _id: driver,
      role: "AGENT",
    });

    if (!driverData) {
      return res.status(404).json({
        success: false,
        message: "Driver not found",
      });
    }

    if (driverData.status !== "ACTIVE") {
      return res.status(400).json({
        success: false,
        message: "Driver is not active",
      });
    }

    // ----------------------------------
    // Vehicle / driver conflict
    // ----------------------------------

    const existingTrips = await Trip.find({
      date: new Date(date),

      $or: [
        {
          vehicle,
        },
        {
          driver,
        },
      ],

      status: {
        $nin: ["CANCELLED"],
      },
    }).select("vehicle driver departureTime arrivalTime");

    for (const existingTrip of existingTrips) {
      const sameVehicle =
        existingTrip.vehicle.toString() === vehicle.toString();

      const sameDriver = existingTrip.driver.toString() === driver.toString();

      const overlapping = timesOverlap(
        existingTrip.departureTime,
        existingTrip.arrivalTime,
        departureTime,
        arrivalTime,
      );

      if (overlapping && sameVehicle) {
        return res.status(409).json({
          success: false,
          message:
            "This vehicle is already assigned to another trip during this time",
        });
      }

      if (overlapping && sameDriver) {
        return res.status(409).json({
          success: false,
          message:
            "This driver is already assigned to another trip during this time",
        });
      }
    }

    // ----------------------------------
    // Create trip / daily schedule
    // ----------------------------------
    const startDate = new Date(date);
    startDate.setHours(0, 0, 0, 0);
    const endDate = isDailySchedule ? new Date(scheduleEndDate || date) : startDate;
    endDate.setHours(0, 0, 0, 0);
    if (endDate < startDate) {
      return res.status(400).json({ success:false, message:"Schedule end date cannot be before the start date" });
    }
    if (isDailySchedule && (endDate - startDate) / 86400000 > 366) {
      return res.status(400).json({ success:false, message:"Daily schedules can be created for up to 1 year" });
    }

    const selectedVehicle = await Vehicle.findById(vehicle).select("owner");
    const selectedRoute = await Route.findById(route).select("stops");
    const hasRouteFares = selectedVehicle && selectedRoute && await isRouteConfigured(selectedVehicle.owner, route, selectedRoute.stops);
    const initialStatus = hasRouteFares ? "SCHEDULED" : "FARE_PENDING";
    const scheduleKey = isDailySchedule ? `daily-${new Date().getTime()}-${String(route)}-${departureTime}` : null;
    const createdTrips = [];
    for (let cursor = new Date(startDate); cursor <= endDate; cursor.setDate(cursor.getDate() + 1)) {
      const tripDate = new Date(cursor);
      // A vehicle/driver may operate multiple trips on the same day.
      // Reject only trips whose time windows overlap; non-overlapping trips
      // on the same date are valid and must remain independent.
      const existingTripsForDate = await Trip.find({
        date: tripDate,
        $or: [{ vehicle }, { driver }],
        status: { $nin: ["CANCELLED"] },
      }).select("vehicle driver departureTime arrivalTime");

      for (const existing of existingTripsForDate) {
        if (!timesOverlap(existing.departureTime, existing.arrivalTime, departureTime, arrivalTime)) continue;

        const dayLabel = tripDate.toISOString().slice(0, 10);
        if (existing.vehicle.toString() === String(vehicle)) {
          return res.status(409).json({
            success: false,
            message: `Vehicle is already assigned to an overlapping trip on ${dayLabel} (${existing.departureTime}–${existing.arrivalTime})`,
          });
        }
        if (existing.driver.toString() === String(driver)) {
          return res.status(409).json({
            success: false,
            message: `Driver is already assigned to an overlapping trip on ${dayLabel} (${existing.departureTime}–${existing.arrivalTime})`,
          });
        }
      }
      const created = await Trip.create({ route, vehicle, driver, date:tripDate, departureTime, arrivalTime, stopTimings:timingResult.stopTimings, status:initialStatus, isDailySchedule:Boolean(isDailySchedule), scheduleKey, scheduleEndDate:isDailySchedule?endDate:null, isRunning:true });
      createdTrips.push(created);
    }

    const populatedTrips = await Trip.find({ _id: { $in: createdTrips.map(t=>t._id) } }).populate("route").populate("vehicle").populate("driver", "name email phone role status").sort({date:1});
    return res.status(201).json({ success:true, message:isDailySchedule?`Daily schedule created for ${populatedTrips.length} days`:`Trip created successfully`, trip:populatedTrips[0], trips:populatedTrips, count:populatedTrips.length });
  } catch (error) {
    console.error("Create trip error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// ======================================
// GET ALL TRIPS
// ======================================

const getTrips = async (req, res) => {
  try {
    let filter = {};

    if (req.user.role === "OWNER") {
      const ownerVehicles = await Vehicle.find({
        owner: req.user.id,
      }).select("_id");

      const vehicleIds = ownerVehicles.map((vehicle) => vehicle._id);

      filter.vehicle = {
        $in: vehicleIds,
      };
    }

    if (req.user.role === "AGENT") {
      filter.driver = req.user.id;
    }

    const trips = await Trip.find(filter)
      .populate("route")
      .populate("vehicle")
      .populate("driver", "name email phone role status")
      .sort({
        date: 1,
      });

    return res.status(200).json({
      success: true,
      count: trips.length,
      trips,
    });
  } catch (error) {
    console.error("Get trips error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// ======================================
// GET SINGLE TRIP
// ======================================

const getTrip = async (req, res) => {
  try {
    const trip = await Trip.findById(req.params.id)
      .populate("route")
      .populate("vehicle")
      .populate("driver", "name email phone role status");

    if (!trip) {
      return res.status(404).json({
        success: false,
        message: "Trip not found",
      });
    }

    return res.status(200).json({
      success: true,
      trip,
    });
  } catch (error) {
    console.error("Get trip error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// ======================================
// UPDATE TRIP
// ======================================

const updateTrip = async (req, res) => {
  try {
    const {
      route,
      vehicle,
      driver,
      date,
      departureTime,
      arrivalTime,
      stopTimings,
    } = req.body;

    const trip = await Trip.findById(req.params.id);

    if (!trip) {
      return res.status(404).json({
        success: false,
        message: "Trip not found",
      });
    }

    if (trip.status === "COMPLETED") {
      return res.status(400).json({
        success: false,
        message: "Completed trip cannot be modified",
      });
    }

    const finalRoute = route || trip.route;

    const finalVehicle = vehicle || trip.vehicle;

    const finalDriver = driver || trip.driver;

    const finalDeparture = departureTime || trip.departureTime;

    const finalArrival = arrivalTime || trip.arrivalTime;

    // ----------------------------------
    // Route
    // ----------------------------------

    const routeData = await Route.findById(finalRoute);

    if (!routeData || routeData.status !== "ACTIVE") {
      return res.status(400).json({
        success: false,
        message: "Invalid or inactive route",
      });
    }

    // ----------------------------------
    // Vehicle
    // ----------------------------------

    const vehicleData = await Vehicle.findById(finalVehicle);

    if (!vehicleData || vehicleData.status !== "ACTIVE") {
      return res.status(400).json({
        success: false,
        message: "Invalid or inactive vehicle",
      });
    }

    // ----------------------------------
    // Driver
    // ----------------------------------

    const driverData = await User.findOne({
      _id: finalDriver,
      role: "AGENT",
      status: "ACTIVE",
    });

    if (!driverData) {
      return res.status(400).json({
        success: false,
        message: "Invalid or inactive driver",
      });
    }

    // ----------------------------------
    // Validate overall times
    // ----------------------------------

    const finalDepartureMinutes = timeToMinutes(finalDeparture);

    const finalArrivalMinutes = timeToMinutes(finalArrival);

    if (finalDepartureMinutes === null || finalArrivalMinutes === null) {
      return res.status(400).json({
        success: false,
        message: "Invalid trip times",
      });
    }

    if (finalDepartureMinutes >= finalArrivalMinutes) {
      return res.status(400).json({
        success: false,
        message: "Arrival time must be after departure time",
      });
    }

    // ----------------------------------
    // Stop timings
    // ----------------------------------

    let finalStopTimings = stopTimings;

    // If route/timing is being changed, validate
    // the submitted schedule.
    //
    // For old trips that have no stopTimings and
    // the user is only editing another field,
    // preserve the old state.
    if (Array.isArray(stopTimings)) {
      const timingResult = buildStopTimings({
        routeData,
        stopTimings,
        departureTime: finalDeparture,
        arrivalTime: finalArrival,
      });

      if (timingResult.error) {
        return res.status(400).json({
          success: false,
          message: timingResult.error,
        });
      }

      finalStopTimings = timingResult.stopTimings;
    } else if (route && String(route) !== String(trip.route)) {
      return res.status(400).json({
        success: false,
        message: "Stop timings are required when changing the route",
      });
    }

    trip.route = finalRoute;
    trip.vehicle = finalVehicle;
    trip.driver = finalDriver;

    if (date) {
      trip.date = date;
    }

    trip.departureTime = finalDeparture;
    trip.arrivalTime = finalArrival;

    if (Array.isArray(finalStopTimings)) {
      trip.stopTimings = finalStopTimings;
    }

    await trip.save();

    const updatedTrip = await Trip.findById(trip._id)
      .populate("route")
      .populate("vehicle")
      .populate("driver", "name email phone role status");

    return res.status(200).json({
      success: true,
      message: "Trip updated successfully",
      trip: updatedTrip,
    });
  } catch (error) {
    console.error("Update trip error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// ======================================
// CHANGE TRIP STATUS
// ======================================

const updateTripStatus = async (req, res) => {
  try {
    const { status } = req.body;

    const allowedStatuses = [
      "DRAFT",
      "FARE_PENDING",
      "SCHEDULED",
      "IN_PROGRESS",
      "COMPLETED",
      "CANCELLED",
    ];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid trip status",
      });
    }

    const trip = await Trip.findById(req.params.id);

    if (!trip) {
      return res.status(404).json({
        success: false,
        message: "Trip not found",
      });
    }

    trip.status = status;

    await trip.save();

    return res.status(200).json({
      success: true,
      message: `Trip status changed to ${status}`,
      trip,
    });
  } catch (error) {
    console.error("Update trip status error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// ======================================
// GET SEAT AVAILABILITY
// ======================================

const getSeatAvailability = async (req, res) => {
  try {
    const { fromStop, toStop } = req.query;

    const { id: tripId } = req.params;

    if (!fromStop || !toStop) {
      return res.status(400).json({
        success: false,
        message: "fromStop and toStop are required",
      });
    }

    const trip = await Trip.findById(tripId)
      .populate("route")
      .populate("vehicle");

    if (!trip) {
      return res.status(404).json({
        success: false,
        message: "Trip not found",
      });
    }

    const from = trip.route.stops.find(
      (stop) => stop._id.toString() === fromStop.toString(),
    );

    const to = trip.route.stops.find(
      (stop) => stop._id.toString() === toStop.toString(),
    );

    if (!from || !to) {
      return res.status(400).json({
        success: false,
        message: "Invalid boarding or dropping stop",
      });
    }

    if (from.sequence >= to.sequence) {
      return res.status(400).json({
        success: false,
        message: "Invalid journey direction",
      });
    }

    const bookings = await Booking.find({
      trip: tripId,
      status: {
        $in: ["PENDING", "CONFIRMED"],
      },
    });

    const locks = await SeatLock.find({
      trip: tripId,
      expiresAt: {
        $gt: new Date(),
      },
    });

    const layout = normalizeSeatLayout(trip.vehicle.seatLayout, trip.vehicle.totalSeats);
    const seats = generateSeatNumbers(trip.vehicle.totalSeats);

    const result = seats.map((seatNumber) => {
      let status = "AVAILABLE";

      for (const booking of bookings) {
        if (booking.seatNumber !== seatNumber) {
          continue;
        }

        if (
          segmentsOverlap(
            booking.boardingSequence,
            booking.droppingSequence,
            from.sequence,
            to.sequence,
          )
        ) {
          status = "BOOKED";
          break;
        }
      }

      if (status === "AVAILABLE") {
        for (const lock of locks) {
          if (lock.seatNumber !== seatNumber) {
            continue;
          }

          if (
            segmentsOverlap(
              lock.boardingSequence,
              lock.droppingSequence,
              from.sequence,
              to.sequence,
            )
          ) {
            status = "LOCKED";
            break;
          }
        }
      }

      const layoutSeat = layout.seats.find((seat) => String(seat.seatNumber) === String(seatNumber));

      return {
        seatNumber,
        status,
        x: layoutSeat?.x,
        y: layoutSeat?.y,
        seatId: layoutSeat?.id || `seat-${seatNumber}`,
      };
    });

    return res.status(200).json({
      success: true,

      tripId,

      seatLayout: layout,

      journey: {
        from: {
          id: from._id,
          name: from.name,
          sequence: from.sequence,
        },

        to: {
          id: to._id,
          name: to.name,
          sequence: to.sequence,
        },
      },

      seats: result,
    });
  } catch (error) {
    console.error("Seat availability error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// ======================================
// OWNER / DRIVER: TOGGLE SPECIFIC DATE
// ======================================
const toggleTripRunning = async (req, res) => {
  try {
    const trip = await Trip.findById(req.params.id).populate("vehicle");
    if (!trip) return res.status(404).json({success:false,message:"Trip not found"});
    if (req.user.role === "AGENT" && String(trip.driver) !== String(req.user.id)) return res.status(403).json({success:false,message:"You can only update your assigned trip"});
    if (req.user.role === "OWNER" && String(trip.vehicle?.owner) !== String(req.user.id)) return res.status(403).json({success:false,message:"You can only update trips for your vehicles"});
    const isRunning = Boolean(req.body.isRunning);
    trip.isRunning = isRunning;
    trip.status = isRunning ? (trip.status === "CANCELLED" ? "SCHEDULED" : trip.status) : "CANCELLED";
    await trip.save();
    res.json({success:true,message:isRunning?"Trip enabled for this date":"Trip disabled for this date",trip});
  } catch(e){ console.error("Toggle trip running error:",e); res.status(500).json({success:false,message:"Server error"}); }
};

module.exports = {
  createTrip,
  getTrips,
  getTrip,
  updateTrip,
  updateTripStatus,
  toggleTripRunning,
  getSeatAvailability,
};
