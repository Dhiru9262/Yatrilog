const mongoose = require("mongoose");
const routeFareSchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  route: { type: mongoose.Schema.Types.ObjectId, ref: "Route", required: true },
  fromStop: { type: mongoose.Schema.Types.ObjectId, required: true },
  toStop: { type: mongoose.Schema.Types.ObjectId, required: true },
  amount: { type: Number, required: true, min: 0 },
}, { timestamps: true });
routeFareSchema.index({ owner: 1, route: 1, fromStop: 1, toStop: 1 }, { unique: true });
module.exports = mongoose.model("RouteFare", routeFareSchema);
