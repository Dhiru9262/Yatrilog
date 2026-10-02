const RouteFare = require("../models/RouteFare");
const LegacyFare = require("../models/Fare");
const { getFareContext, getRouteFares, getFareForTrip, isRouteConfigured } = require("../services/routeFareService");
const Trip = require("../models/Trip");
const Vehicle = require("../models/Vehicle");

const {
  generateFareCombinations,
  areAllFaresConfigured,
} = require("../services/fareService");

// =========================
// GET FARE CONFIGURATION
// =========================

const getTripFares = async (req, res) => {
  try {
    const { tripId } = req.params;

    const trip = await Trip.findById(tripId)
      .populate("route")
      .populate("vehicle");

    if (!trip) {
      return res.status(404).json({
        success: false,
        message: "Trip not found",
      });
    }

    // Owner can only access their own vehicle's trips
    if (req.user.role === "OWNER") {
      const vehicle = await Vehicle.findById(trip.vehicle._id);

      if (!vehicle || vehicle.owner.toString() !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: "You do not have access to this trip",
        });
      }
    }

    const combinations = await generateFareCombinations(tripId);

    const existingFares = await getRouteFares(trip);

    // Existing per-trip fares are a fallback for installations upgrading to shared fares.
    const legacyFares = await LegacyFare.find({ trip:tripId });
    const fareMap = new Map(legacyFares.map(f => [`${f.fromStop}_${f.toStop}`, f.amount]));

    existingFares.forEach((fare) => {
      const key = `${fare.fromStop.toString()}_${fare.toStop.toString()}`;

      fareMap.set(key, fare.amount);
    });

    const fares = combinations.map((combination) => {
      const key = `${combination.fromStop._id.toString()}_${combination.toStop._id.toString()}`;

      return {
        fromStop: {
          id: combination.fromStop._id,
          name: combination.fromStop.name,
          sequence: combination.fromStop.sequence,
        },

        toStop: {
          id: combination.toStop._id,
          name: combination.toStop.name,
          sequence: combination.toStop.sequence,
        },

        amount: fareMap.has(key) ? fareMap.get(key) : null,
      };
    });

    res.status(200).json({
      success: true,
      tripId,
      tripStatus: trip.status,
      fares,
    });
  } catch (error) {
    console.error("Get fares error:", error);

    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// =========================
// SAVE FARES
// =========================

const saveTripFares = async (req, res) => {
  try {
    const { tripId } = req.params;
    const { fares } = req.body;

    if (!Array.isArray(fares) || fares.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Fares must be a non-empty array",
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

    // A route fare can be edited after scheduling and affects all owner trips.
    if (trip.status === "CANCELLED") return res.status(400).json({ success:false, message:"Cannot edit fares through a cancelled trip" });

    // Verify owner
    if (req.user.role === "OWNER") {
      const vehicle = await Vehicle.findById(trip.vehicle._id);

      if (!vehicle || vehicle.owner.toString() !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: "You do not own this trip",
        });
      }
    }

    const stops = trip.route.stops;

    // Create a lookup of valid stops
    const stopMap = new Map();

    stops.forEach((stop) => {
      stopMap.set(stop._id.toString(), stop);
    });

    // Validate each submitted fare
    for (const fare of fares) {
      if (!fare.fromStop || !fare.toStop || fare.amount === undefined) {
        return res.status(400).json({
          success: false,
          message: "fromStop, toStop and amount are required",
        });
      }

      if (fare.amount === null || !Number.isFinite(Number(fare.amount)) || Number(fare.amount) < 0 || String(fare.amount).trim() === "") {
        return res.status(400).json({
          success: false,
          message: "Fare cannot be negative",
        });
      }

      const fromStop = stopMap.get(fare.fromStop.toString());

      const toStop = stopMap.get(fare.toStop.toString());

      if (!fromStop || !toStop) {
        return res.status(400).json({
          success: false,
          message: "Invalid stop for this trip",
        });
      }

      // Critical rule:
      // FROM must come before TO
      if (fromStop.sequence >= toStop.sequence) {
        return res.status(400).json({
          success: false,
          message: "Invalid stop direction",
        });
      }
    }

    const context = await getFareContext(trip);
    if (!context) return res.status(404).json({ success:false, message:"Vehicle not found" });
    const submitted = new Set();
    for (const fare of fares) {
      const key = `${fare.fromStop}_${fare.toStop}`;
      if (submitted.has(key)) return res.status(400).json({ success:false, message:"Duplicate stop pair" });
      submitted.add(key);
    }
    await RouteFare.bulkWrite(fares.map(fare => ({ updateOne: {
      filter: { owner:context.owner, route:context.route, fromStop:fare.fromStop, toStop:fare.toStop },
      update: { $set: { amount:Number(fare.amount) } }, upsert:true
    } })));

    const allConfigured = await isRouteConfigured(context.owner, context.route, stops);

    // Once every fare exists,
    // trip becomes SCHEDULED
    if (allConfigured) {
      const vehicles = await Vehicle.find({ owner:context.owner }).distinct("_id");
      await Trip.updateMany({ route:context.route, vehicle:{ $in:vehicles }, status:"FARE_PENDING" }, { $set:{status:"SCHEDULED"} });
      trip.status = trip.status === "FARE_PENDING" ? "SCHEDULED" : trip.status;
    }

    const savedFares = await getRouteFares(trip);

    res.status(200).json({
      success: true,
      message: allConfigured
        ? "Route fares saved for all your vans. Pending trips on this route are now scheduled."
        : "Route fares saved. Complete the remaining stop pairs to schedule trips.",
      tripStatus: trip.status,
      fares: savedFares,
    });
  } catch (error) {
    console.error("Save fares error:", error);

    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// =========================
// GET EXACT FARE
// =========================

const getExactFare = async (req, res) => {
  try {
    const { tripId, fromStopId, toStopId } = req.params;

    const fare = await getFareForTrip(tripId, fromStopId, toStopId);

    if (!fare) {
      return res.status(404).json({
        success: false,
        message: "Fare not configured",
      });
    }

    res.status(200).json({
      success: true,
      fare,
    });
  } catch (error) {
    console.error("Get exact fare error:", error);

    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

module.exports = {
  getTripFares,
  saveTripFares,
  getExactFare,
};
