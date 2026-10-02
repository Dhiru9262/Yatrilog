const Route = require("../models/Route");
const Stop = require("../models/Stop");

// =========================
// CREATE ROUTE
// =========================

const createRoute = async (req, res) => {
  try {
    const { name, stops } = req.body;

    if (!name || !stops) {
      return res.status(400).json({
        success: false,
        message: "Route name and stops are required",
      });
    }

    if (!Array.isArray(stops)) {
      return res.status(400).json({
        success: false,
        message: "Stops must be an array",
      });
    }

    if (stops.length < 2) {
      return res.status(400).json({
        success: false,
        message: "A route must have at least two stops",
      });
    }

    for (const stop of stops) {
      if (!stop.name || stop.name.trim() === "") {
        return res.status(400).json({
          success: false,
          message: "Every stop must have a name",
        });
      }
    }

    const formattedStops = stops.map((stop, index) => ({
      name: stop.name.trim(),
      sequence: index + 1,
    }));

    const route = await Route.create({
      name: name.trim(),
      stops: formattedStops,
    });

    // Also make sure these stops exist
    // in the global Stop collection.
    for (const stop of formattedStops) {
      await Stop.findOneAndUpdate(
        {
          name: stop.name,
        },
        {
          name: stop.name,
        },
        {
          upsert: true,
          new: true,
          setDefaultsOnInsert: true,
        },
      );
    }

    return res.status(201).json({
      success: true,
      message: "Route created successfully",
      route,
    });
  } catch (error) {
    console.error("Create route error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// =========================
// CREATE STOP
// =========================

const createStop = async (req, res) => {
  try {
    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Stop name is required",
      });
    }

    const stopName = name.trim();

    // Check manually so we can return
    // a friendly error message.
    const existingStop = await Stop.findOne({
      name: stopName,
    }).collation({
      locale: "en",
      strength: 2,
    });

    if (existingStop) {
      return res.status(409).json({
        success: false,
        message: "This stop already exists",
        stop: existingStop,
      });
    }

    const stop = await Stop.create({
      name: stopName,
    });

    return res.status(201).json({
      success: true,
      message: "Stop created successfully",
      stop,
    });
  } catch (error) {
    console.error("Create stop error:", error);

    // Duplicate key protection
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "This stop already exists",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Unable to create stop",
    });
  }
};

// =========================
// GET ALL ROUTES
// =========================

const getRoutes = async (req, res) => {
  try {
    const routes = await Route.find().sort({
      createdAt: -1,
    });

    return res.status(200).json({
      success: true,
      count: routes.length,
      routes,
    });
  } catch (error) {
    console.error("Get routes error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// =========================
// GET SINGLE ROUTE
// =========================

const getRoute = async (req, res) => {
  try {
    const route = await Route.findById(req.params.id);

    if (!route) {
      return res.status(404).json({
        success: false,
        message: "Route not found",
      });
    }

    return res.status(200).json({
      success: true,
      route,
    });
  } catch (error) {
    console.error("Get route error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// =========================
// UPDATE ROUTE
// =========================

const updateRoute = async (req, res) => {
  try {
    const { name, stops } = req.body;

    const route = await Route.findById(req.params.id);

    if (!route) {
      return res.status(404).json({
        success: false,
        message: "Route not found",
      });
    }

    if (name) {
      route.name = name.trim();
    }

    if (stops) {
      if (!Array.isArray(stops)) {
        return res.status(400).json({
          success: false,
          message: "Stops must be an array",
        });
      }

      if (stops.length < 2) {
        return res.status(400).json({
          success: false,
          message: "A route must have at least two stops",
        });
      }

      for (const stop of stops) {
        if (!stop.name || stop.name.trim() === "") {
          return res.status(400).json({
            success: false,
            message: "Every stop must have a name",
          });
        }
      }

      route.stops = stops.map((stop, index) => ({
        name: stop.name.trim(),
        sequence: index + 1,
      }));

      // Keep global stops synchronized.
      for (const stop of route.stops) {
        await Stop.findOneAndUpdate(
          {
            name: stop.name,
          },
          {
            name: stop.name,
          },
          {
            upsert: true,
            new: true,
            setDefaultsOnInsert: true,
          },
        );
      }
    }

    await route.save();

    return res.status(200).json({
      success: true,
      message: "Route updated successfully",
      route,
    });
  } catch (error) {
    console.error("Update route error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// =========================
// CHANGE ROUTE STATUS
// =========================

const updateRouteStatus = async (req, res) => {
  try {
    const { status } = req.body;

    if (!["ACTIVE", "BLOCKED"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status",
      });
    }

    const route = await Route.findById(req.params.id);

    if (!route) {
      return res.status(404).json({
        success: false,
        message: "Route not found",
      });
    }

    route.status = status;

    await route.save();

    return res.status(200).json({
      success: true,
      message: `Route ${status.toLowerCase()} successfully`,
      route,
    });
  } catch (error) {
    console.error("Update route status error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// ======================================
// GET ALL STOPS
// ======================================

const getAllStops = async (req, res) => {
  try {
    // Global stops created from Admin UI
    const globalStops = await Stop.find().sort({
      name: 1,
    });

    // Existing embedded stops from old routes
    const routes = await Route.find({}).select("stops");

    const stopMap = new Map();

    // First add global stops
    for (const stop of globalStops) {
      const key = stop.name.trim().toLowerCase();

      if (!stopMap.has(key)) {
        stopMap.set(key, {
          _id: stop._id,
          name: stop.name.trim(),
        });
      }
    }

    // Then add old embedded route stops
    for (const route of routes) {
      for (const stop of route.stops) {
        const key = stop.name.trim().toLowerCase();

        if (!stopMap.has(key)) {
          stopMap.set(key, {
            _id: stop._id,
            name: stop.name.trim(),
          });
        }
      }
    }

    const stops = Array.from(stopMap.values()).sort((a, b) =>
      a.name.localeCompare(b.name),
    );

    return res.status(200).json({
      success: true,
      count: stops.length,
      stops,
    });
  } catch (error) {
    console.error("Get all stops error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

module.exports = {
  createRoute,
  createStop,
  getRoutes,
  getRoute,
  updateRoute,
  updateRouteStatus,
  getAllStops,
};
