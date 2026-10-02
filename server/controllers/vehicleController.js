const Vehicle = require("../models/Vehicle");
const User = require("../models/User");
const { normalizeSeatLayout, validateSeatLayout } = require("../services/vehicleSeatService");

// =========================
// CREATE VEHICLE
// =========================

const createVehicle = async (req, res) => {
  try {
    const { vehicleNumber, type, totalSeats, seatLayout, owner } = req.body;

    if (!vehicleNumber || !type || !totalSeats || !owner) {
      return res.status(400).json({
        success: false,
        message: "vehicleNumber, type, totalSeats and owner are required",
      });
    }

    // Check owner
    const ownerUser = await User.findOne({
      _id: owner,
      role: "OWNER",
    });

    if (!ownerUser) {
      return res.status(404).json({
        success: false,
        message: "Owner not found",
      });
    }

    // Check duplicate vehicle number
    const existingVehicle = await Vehicle.findOne({
      vehicleNumber: vehicleNumber.toUpperCase(),
    });

    if (existingVehicle) {
      return res.status(400).json({
        success: false,
        message: "Vehicle with this number already exists",
      });
    }

    const vehicle = await Vehicle.create({
      vehicleNumber,
      type,
      totalSeats,
      seatLayout: seatLayout || "2x2",
      owner,
    });

    const populatedVehicle = await Vehicle.findById(vehicle._id).populate(
      "owner",
      "name email phone",
    );

    res.status(201).json({
      success: true,
      message: "Vehicle created successfully",
      vehicle: populatedVehicle,
    });
  } catch (error) {
    console.error("Create vehicle error:", error);

    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// =========================
// GET ALL VEHICLES
// =========================

const getVehicles = async (req, res) => {
  try {
    let filter = {};

    if (req.user.role === "OWNER") {
      filter.owner = req.user.id;
    }

    const vehicles = await Vehicle.find(filter)
      .populate("owner", "name email phone")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: vehicles.length,
      vehicles,
    });
  } catch (error) {
    console.error("Get vehicles error:", error);

    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// =========================
// GET SINGLE VEHICLE
// =========================

const getVehicle = async (req, res) => {
  try {
    const vehicle = await Vehicle.findById(req.params.id).populate(
      "owner",
      "name email phone",
    );

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: "Vehicle not found",
      });
    }

    res.status(200).json({
      success: true,
      vehicle,
    });
  } catch (error) {
    console.error("Get vehicle error:", error);

    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// =========================
// UPDATE VEHICLE
// =========================

const updateVehicle = async (req, res) => {
  try {
    const { vehicleNumber, type, totalSeats, seatLayout, owner } = req.body;

    const vehicle = await Vehicle.findById(req.params.id);

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: "Vehicle not found",
      });
    }

    // If owner is being changed
    if (owner) {
      const ownerUser = await User.findOne({
        _id: owner,
        role: "OWNER",
      });

      if (!ownerUser) {
        return res.status(404).json({
          success: false,
          message: "Owner not found",
        });
      }

      vehicle.owner = owner;
    }

    if (vehicleNumber) {
      vehicle.vehicleNumber = vehicleNumber.toUpperCase();
    }

    if (type) {
      vehicle.type = type;
    }

    if (totalSeats) {
      vehicle.totalSeats = totalSeats;
    }

    if (seatLayout) {
      vehicle.seatLayout = seatLayout;
    }

    await vehicle.save();

    const updatedVehicle = await Vehicle.findById(vehicle._id).populate(
      "owner",
      "name email phone",
    );

    res.status(200).json({
      success: true,
      message: "Vehicle updated successfully",
      vehicle: updatedVehicle,
    });
  } catch (error) {
    console.error("Update vehicle error:", error);

    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// =========================
// UPDATE CANONICAL SEAT LAYOUT
// =========================

const updateSeatLayout = async (req, res) => {
  try {
    const vehicle = await Vehicle.findById(req.params.id);

    if (!vehicle) {
      return res.status(404).json({ success: false, message: "Vehicle not found" });
    }

    if (req.user.role === "OWNER" && String(vehicle.owner) !== String(req.user.id)) {
      return res.status(403).json({ success: false, message: "You can only edit your own vehicles" });
    }

    const layout = normalizeSeatLayout(req.body?.seatLayout, vehicle.totalSeats);
    const validation = validateSeatLayout(layout, vehicle.totalSeats);

    if (!validation.valid) {
      return res.status(400).json({ success: false, message: validation.message });
    }

    vehicle.seatLayout = layout;
    await vehicle.save();

    const updatedVehicle = await Vehicle.findById(vehicle._id).populate("owner", "name email phone");

    return res.status(200).json({
      success: true,
      message: "Seat layout saved for this vehicle",
      vehicle: updatedVehicle,
      seatLayout: layout,
    });
  } catch (error) {
    console.error("Update seat layout error:", error);
    return res.status(500).json({ success: false, message: "Unable to save seat layout" });
  }
};

// =========================
// CHANGE VEHICLE STATUS
// =========================

const updateVehicleStatus = async (req, res) => {
  try {
    const { status } = req.body;

    if (!["ACTIVE", "BLOCKED"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status",
      });
    }

    const vehicle = await Vehicle.findById(req.params.id);

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: "Vehicle not found",
      });
    }

    vehicle.status = status;

    await vehicle.save();

    res.status(200).json({
      success: true,
      message: `Vehicle ${status.toLowerCase()} successfully`,
      vehicle,
    });
  } catch (error) {
    console.error("Update vehicle status error:", error);

    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

module.exports = {
  createVehicle,
  getVehicles,
  getVehicle,
  updateVehicle,
  updateVehicleStatus,
  updateSeatLayout,
};
