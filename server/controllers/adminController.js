const User = require("../models/User");
const bcrypt = require("bcryptjs");

// =========================
// CREATE OWNER
// =========================

const createOwner = async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;

    if (!name || !email || !phone || !password) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User with this email already exists",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const owner = await User.create({
      name,
      email,
      phone,
      password: hashedPassword,
      role: "OWNER",
      status: "ACTIVE",
    });

    res.status(201).json({
      success: true,
      message: "Owner created successfully",
      owner: {
        id: owner._id,
        name: owner.name,
        email: owner.email,
        phone: owner.phone,
        role: owner.role,
        status: owner.status,
      },
    });
  } catch (error) {
    console.error("Create owner error:", error);

    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// =========================
// GET ALL OWNERS
// =========================

const getOwners = async (req, res) => {
  try {
    const owners = await User.find({
      role: "OWNER",
    })
      .select("-password")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: owners.length,
      owners,
    });
  } catch (error) {
    console.error("Get owners error:", error);

    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// =========================
// GET SINGLE OWNER
// =========================

const getOwner = async (req, res) => {
  try {
    const owner = await User.findOne({
      _id: req.params.id,
      role: "OWNER",
    }).select("-password");

    if (!owner) {
      return res.status(404).json({
        success: false,
        message: "Owner not found",
      });
    }

    res.status(200).json({
      success: true,
      owner,
    });
  } catch (error) {
    console.error("Get owner error:", error);

    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// =========================
// UPDATE OWNER
// =========================

const updateOwner = async (req, res) => {
  try {
    const { name, email, phone } = req.body;

    const owner = await User.findOne({
      _id: req.params.id,
      role: "OWNER",
    });

    if (!owner) {
      return res.status(404).json({
        success: false,
        message: "Owner not found",
      });
    }

    if (name) owner.name = name;
    if (email) owner.email = email;
    if (phone) owner.phone = phone;

    await owner.save();

    res.status(200).json({
      success: true,
      message: "Owner updated successfully",
      owner: {
        id: owner._id,
        name: owner.name,
        email: owner.email,
        phone: owner.phone,
        role: owner.role,
        status: owner.status,
      },
    });
  } catch (error) {
    console.error("Update owner error:", error);

    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// =========================
// CHANGE OWNER STATUS
// =========================

const updateOwnerStatus = async (req, res) => {
  try {
    const { status } = req.body;

    if (!["ACTIVE", "BLOCKED"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status",
      });
    }

    const owner = await User.findOne({
      _id: req.params.id,
      role: "OWNER",
    });

    if (!owner) {
      return res.status(404).json({
        success: false,
        message: "Owner not found",
      });
    }

    owner.status = status;

    await owner.save();

    res.status(200).json({
      success: true,
      message: `Owner ${status.toLowerCase()} successfully`,
      owner: {
        id: owner._id,
        name: owner.name,
        email: owner.email,
        phone: owner.phone,
        role: owner.role,
        status: owner.status,
      },
    });
  } catch (error) {
    console.error("Update owner status error:", error);

    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// =========================
// CREATE DRIVER / AGENT
// =========================

const createDriver = async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;

    if (!name || !email || !phone || !password) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User with this email already exists",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const driver = await User.create({
      name,
      email,
      phone,
      password: hashedPassword,
      role: "AGENT",
      status: "ACTIVE",
    });

    res.status(201).json({
      success: true,
      message: "Driver created successfully",
      driver: {
        id: driver._id,
        name: driver.name,
        email: driver.email,
        phone: driver.phone,
        role: driver.role,
        status: driver.status,
      },
    });
  } catch (error) {
    console.error("Create driver error:", error);

    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// =========================
// GET ALL DRIVERS
// =========================

const getDrivers = async (req, res) => {
  try {
    const drivers = await User.find({
      role: "AGENT",
    })
      .select("-password")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: drivers.length,
      drivers,
    });
  } catch (error) {
    console.error("Get drivers error:", error);

    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// =========================
// GET SINGLE DRIVER
// =========================

const getDriver = async (req, res) => {
  try {
    const driver = await User.findOne({
      _id: req.params.id,
      role: "AGENT",
    }).select("-password");

    if (!driver) {
      return res.status(404).json({
        success: false,
        message: "Driver not found",
      });
    }

    res.status(200).json({
      success: true,
      driver,
    });
  } catch (error) {
    console.error("Get driver error:", error);

    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// =========================
// UPDATE DRIVER
// =========================

const updateDriver = async (req, res) => {
  try {
    const { name, email, phone } = req.body;

    const driver = await User.findOne({
      _id: req.params.id,
      role: "AGENT",
    });

    if (!driver) {
      return res.status(404).json({
        success: false,
        message: "Driver not found",
      });
    }

    if (name) driver.name = name;
    if (email) driver.email = email;
    if (phone) driver.phone = phone;

    await driver.save();

    res.status(200).json({
      success: true,
      message: "Driver updated successfully",
      driver: {
        id: driver._id,
        name: driver.name,
        email: driver.email,
        phone: driver.phone,
        role: driver.role,
        status: driver.status,
      },
    });
  } catch (error) {
    console.error("Update driver error:", error);

    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// =========================
// CHANGE DRIVER STATUS
// =========================

const updateDriverStatus = async (req, res) => {
  try {
    const { status } = req.body;

    if (!["ACTIVE", "BLOCKED"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status",
      });
    }

    const driver = await User.findOne({
      _id: req.params.id,
      role: "AGENT",
    });

    if (!driver) {
      return res.status(404).json({
        success: false,
        message: "Driver not found",
      });
    }

    driver.status = status;

    await driver.save();

    res.status(200).json({
      success: true,
      message: `Driver ${status.toLowerCase()} successfully`,
      driver: {
        id: driver._id,
        name: driver.name,
        email: driver.email,
        phone: driver.phone,
        role: driver.role,
        status: driver.status,
      },
    });
  } catch (error) {
    console.error("Update driver status error:", error);

    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

module.exports = {
  createOwner,
  getOwners,
  getOwner,
  updateOwner,
  updateOwnerStatus,

  createDriver,
  getDrivers,
  getDriver,
  updateDriver,
  updateDriverStatus,
};
