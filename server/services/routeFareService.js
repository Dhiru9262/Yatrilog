const RouteFare = require("../models/RouteFare");
const LegacyFare = require("../models/Fare");
const Trip = require("../models/Trip");
const Vehicle = require("../models/Vehicle");

async function getFareContext(tripOrId) {
  const trip = typeof tripOrId === "object" && tripOrId.route
    ? tripOrId : await Trip.findById(tripOrId);
  if (!trip) return null;
  const vehicle = await Vehicle.findById(trip.vehicle?._id || trip.vehicle).select("owner");
  if (!vehicle) return null;
  return { trip, owner: vehicle.owner, route: trip.route?._id || trip.route };
}

// Shared fares always take precedence; legacy trip fares remain readable until migrated.
async function getFareForTrip(tripOrId, fromStop, toStop) {
  const context = await getFareContext(tripOrId);
  if (!context) return null;
  const shared = await RouteFare.findOne({ owner: context.owner, route: context.route, fromStop, toStop });
  return shared || LegacyFare.findOne({ trip: context.trip._id, fromStop, toStop });
}

async function getRouteFares(tripOrId) {
  const context = await getFareContext(tripOrId);
  if (!context) return [];
  const shared = await RouteFare.find({ owner: context.owner, route: context.route });
  const legacy = await LegacyFare.find({ trip: context.trip._id });
  const seen = new Set(shared.map(f => `${f.fromStop}_${f.toStop}`));
  return [...shared, ...legacy.filter(f => !seen.has(`${f.fromStop}_${f.toStop}`))];
}

async function isRouteConfigured(owner, route, stops) {
  const count = stops.length * (stops.length - 1) / 2;
  if (!count) return false;
  const fares = await RouteFare.find({ owner, route });
  const valid = new Set(fares.map(f => `${f.fromStop}_${f.toStop}`));
  const sorted = [...stops].sort((a,b) => a.sequence-b.sequence);
  for (let i=0;i<sorted.length;i++) for (let j=i+1;j<sorted.length;j++) {
    if (!valid.has(`${sorted[i]._id}_${sorted[j]._id}`)) return false;
  }
  return true;
}

module.exports = { getFareContext, getFareForTrip, getRouteFares, isRouteConfigured };
