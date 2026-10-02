const { getRouteFares } = require("./routeFareService");
const Trip = require("../models/Trip");

// Generate every valid forward stop combination
const generateFareCombinations = async (tripId) => {
  const trip = await Trip.findById(tripId).populate("route");

  if (!trip) {
    throw new Error("Trip not found");
  }

  const stops = [...trip.route.stops].sort((a, b) => a.sequence - b.sequence);

  const combinations = [];

  for (let i = 0; i < stops.length; i++) {
    for (let j = i + 1; j < stops.length; j++) {
      combinations.push({
        fromStop: stops[i],
        toStop: stops[j],
      });
    }
  }

  return combinations;
};

// Check whether all fares have been configured
const areAllFaresConfigured = async (tripId) => {
  const combinations = await generateFareCombinations(tripId);

  const fares = await getRouteFares(tripId);

  if (fares.length !== combinations.length) {
    return false;
  }

  const fareMap = new Set(
    fares.map(
      (fare) => `${fare.fromStop.toString()}_${fare.toStop.toString()}`,
    ),
  );

  for (const combination of combinations) {
    const key = `${combination.fromStop._id.toString()}_${combination.toStop._id.toString()}`;

    if (!fareMap.has(key)) {
      return false;
    }
  }

  return true;
};

module.exports = {
  generateFareCombinations,
  areAllFaresConfigured,
};
