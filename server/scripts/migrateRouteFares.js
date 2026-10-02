// Run once after deploying: node scripts/migrateRouteFares.js
// Copies existing trip-specific fares into shared owner+route fares, without overwriting existing shared fares.
require("dotenv").config();
const mongoose = require("mongoose");
const Trip = require("../models/Trip");
const Fare = require("../models/Fare");
const Vehicle = require("../models/Vehicle");
const Route = require("../models/Route");
const RouteFare = require("../models/RouteFare");
const { isRouteConfigured } = require("../services/routeFareService");
async function main() {
  await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
  let copied=0;
  const fares=await Fare.find({}).sort({createdAt:1});
  for (const fare of fares) {
    const trip=await Trip.findById(fare.trip);
    if (!trip) continue;
    const vehicle=await Vehicle.findById(trip.vehicle);
    if (!vehicle) continue;
    const result=await RouteFare.updateOne(
      {owner:vehicle.owner, route:trip.route, fromStop:fare.fromStop, toStop:fare.toStop},
      {$setOnInsert:{amount:fare.amount}}, {upsert:true}
    );
    copied += result.upsertedCount || 0;
  }
  const pending=await Trip.find({status:"FARE_PENDING"});
  let scheduled=0;
  for (const trip of pending) {
    const vehicle=await Vehicle.findById(trip.vehicle);
    const route=await Route.findById(trip.route);
    if (vehicle && route && await isRouteConfigured(vehicle.owner, route._id, route.stops)) {
      trip.status="SCHEDULED"; await trip.save(); scheduled++;
    }
  }
  console.log(`Copied ${copied} route fares; scheduled ${scheduled} pending trips.`);
  await mongoose.disconnect();
}
main().catch(error => { console.error(error); process.exit(1); });
