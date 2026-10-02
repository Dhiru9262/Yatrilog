const User = require("../models/User");

// ==========================================
// GET USERS BY ROLE
// ==========================================

const getUsersByRole = async (req, res) => {
  try {
    const { role } = req.query;

    const allowedRoles = ["OWNER", "AGENT", "CUSTOMER", "ADMIN"];

    if (!role || !allowedRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: "Invalid or missing role",
      });
    }

    const users = await User.find({
      role,
      status: "ACTIVE",
    })
      .select("_id name email phone role status")
      .sort({
        name: 1,
      });

    return res.status(200).json({
      success: true,
      count: users.length,
      users,
    });
  } catch (error) {
    console.error("Get users by role error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// ==========================================
// UPDATE USER STATUS
// ==========================================

const updateUserStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!["ACTIVE", "BLOCKED"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status",
      });
    }

    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // ==================================
    // PROTECT ADMIN ACCOUNT
    // ==================================

    if (user.role === "ADMIN") {
      return res.status(400).json({
        success: false,
        message: "Admin status cannot be changed here",
      });
    }

    user.status = status;

    await user.save();

    return res.status(200).json({
      success: true,
      message: `User ${status.toLowerCase()} successfully`,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        status: user.status,
      },
    });
  } catch (error) {
    console.error("Update user status error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

module.exports = {
  getUsersByRole,
  updateUserStatus,
};
