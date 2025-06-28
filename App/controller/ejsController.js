//--------------------------------------------------------------------------------------
//                            ejs Controller 
//--------------------------------------------------------------------------------------

const User = require("../models/user");
const Record = require("../models/record");

//--------------------------------------------------------------------------------------
//                            Home Page
//--------------------------------------------------------------------------------------
const home = (req, res) => {
  res.render("home", {
    title: "RBAC System",
    user: req.user || null,
  });
};

//--------------------------------------------------------------------------------------
//                            Authentication Pages
//--------------------------------------------------------------------------------------
const showLogin = (req, res) => {
  if (req.cookies.accessToken) {
    return res.redirect("/dashboard");
  }

  res.render("auth/login", {
    title: "Login",
    message: req.query.message || null,
    messageType: req.query.type || "info",
  });
};

const handleLogin = async (req, res) => {
  try {
    const { username, password, rememberMe } = req.body;

    if (!username || !password) {
      return res.render("auth/login", {
        title: "Login",
        message: "Username and password are required",
        messageType: "error",
        formData: { username },
      });
    }

    const user = await User.findOne({
      $or: [{ username }, { email: username }],
      isActive: true,
    });

    if (!user || !(await user.comparePassword(password))) {
      return res.render("auth/login", {
        title: "Login",
        message: "Invalid credentials",
        messageType: "error",
        formData: { username },
      });
    }

    // Generate tokens
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    // Save refresh token
    await user.addRefreshToken(refreshToken);

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Set cookies
    const accessTokenMaxAge = 15 * 60 * 1000;
    const refreshTokenMaxAge = rememberMe
      ? 7 * 24 * 60 * 60 * 1000
      : 24 * 60 * 60 * 1000; 

    res.cookie("accessToken", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: accessTokenMaxAge,
    });

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: refreshTokenMaxAge,
    });

    res.redirect("/dashboard");
  } catch (error) {
    console.error("Login error:", error);
    res.render("auth/login", {
      title: "Login",
      message: "An error occurred during login",
      messageType: "error",
      formData: { username: req.body.username },
    });
  }
};

const showRegister = (req, res) => {
  if (req.cookies.accessToken) {
    return res.redirect("/dashboard");
  }

  res.render("auth/register", {
    title: "Register",
    message: req.query.message || null,
    messageType: req.query.type || "info",
  });
};

const handleRegister = async (req, res) => {
  try {
    const { username, email, password, confirmPassword, role } = req.body;

    // Validation
    if (!username || !email || !password || !confirmPassword) {
      return res.render("auth/register", {
        title: "Register",
        message: "All fields are required",
        messageType: "error",
        formData: { username, email, role },
      });
    }

    if (password !== confirmPassword) {
      return res.render("auth/register", {
        title: "Register",
        message: "Passwords do not match",
        messageType: "error",
        formData: { username, email, role },
      });
    }

    if (password.length < 6) {
      return res.render("auth/register", {
        title: "Register",
        message: "Password must be at least 6 characters long",
        messageType: "error",
        formData: { username, email, role },
      });
    }

    // Check if user exists
    const existingUser = await User.findOne({
      $or: [{ username }, { email }],
    });

    if (existingUser) {
      return res.render("auth/register", {
        title: "Register",
        message: "Username or email already exists",
        messageType: "error",
        formData: { username, email, role },
      });
    }

    // Create new user
    const user = new User({
      username,
      email,
      password,
      role: role || "employee",
    });

    await user.save();

    res.redirect(
      "/login?message=Registration successful! Please login&type=success"
    );
  } catch (error) {
    console.error("Registration error:", error);
    res.render("auth/register", {
      title: "Register",
      message: "An error occurred during registration",
      messageType: "error",
      formData: {
        username: req.body.username,
        email: req.body.email,
        role: req.body.role,
      },
    });
  }
};

const handleLogout = async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken;

    if (refreshToken && req.user) {
      const user = await User.findById(req.user.id);
      if (user) {
        await user.removeRefreshToken(refreshToken);
      }
    }

    res.clearCookie("accessToken");
    res.clearCookie("refreshToken");
    res.redirect("/login?message=Logged out successfully&type=success");
  } catch (error) {
    console.error("Logout error:", error);
    res.clearCookie("accessToken");
    res.clearCookie("refreshToken");
    res.redirect("/login");
  }
};

//--------------------------------------------------------------------------------------
//                            Dashboard
//--------------------------------------------------------------------------------------
const dashboard = async (req, res) => {
  try {
    // Get user's records count
    const recordsFilter = { isActive: true };
    if (req.user.role !== "admin") {
      recordsFilter.$or = [
        { createdBy: req.user.id },
        { assignedTo: req.user.id },
      ];
    }

    const totalRecords = await Record.countDocuments(recordsFilter);
    const pendingRecords = await Record.countDocuments({
      ...recordsFilter,
      status: "pending",
    });
    const completedRecords = await Record.countDocuments({
      ...recordsFilter,
      status: "completed",
    });

    // Get recent records
    const recentRecords = await Record.find(recordsFilter)
      .populate("createdBy", "username")
      .populate("assignedTo", "username")
      .sort({ createdAt: -1 })
      .limit(5);

    // Get user count (admin only)
    let totalUsers = 0;
    if (req.user.role === "admin") {
      totalUsers = await User.countDocuments({ isActive: true });
    }

    res.render("dashboard", {
      title: "Dashboard",
      stats: {
        totalRecords,
        pendingRecords,
        completedRecords,
        totalUsers,
      },
      recentRecords,
    });
  } catch (error) {
    console.error("Dashboard error:", error);
    res.render("error", {
      title: "Dashboard Error",
      error: {
        status: 500,
        message: "Error loading dashboard",
      },
    });
  }
};

//--------------------------------------------------------------------------------------
//                            Records Management
//--------------------------------------------------------------------------------------
const recordsList = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;
    const status = req.query.status;
    const priority = req.query.priority;

    // Build filter
    const filter = { isActive: true };
    if (status) filter.status = status;
    if (priority) filter.priority = priority;

    // Non-admins can only see their own records
    if (req.user.role !== "admin") {
      filter.$or = [{ createdBy: req.user.id }, { assignedTo: req.user.id }];
    }

    const [records, total, users] = await Promise.all([
      Record.find(filter)
        .populate("createdBy", "username email")
        .populate("assignedTo", "username email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Record.countDocuments(filter),
      User.find({ isActive: true }, "username email") // Only fetch active users
    ]);

    res.render("records/list", {
      title: "Records",
      records,
      users,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalRecords: total,
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1,
      },
      filters: { status, priority },
      message: req.query.message || null,
      messageType: req.query.type || "info",
      user: req.user
    });

  } catch (error) {
    console.error("Records list error:", error);
    res.render("error", {
      title: "Records Error",
      error: {
        status: 500,
        message: "Error loading records",
      },
    });
  }
};


const newRecord = async (req, res) => {
  try {
    // Get all users for assignment dropdown
    const users = await User.find({ isActive: true }).select(
      "username email role"
    );

    res.render("records/new", {
      title: "New Record",
      users,
      message: req.query.message || null,
      messageType: req.query.type || "info",
    });
  } catch (error) {
    console.error("New record page error:", error);
    res.render("error", {
      title: "Error",
      error: {
        status: 500,
        message: "Error loading new record page",
      },
    });
  }
};

const createRecord = async (req, res) => {
  try {
    const { title, description, status, priority, assignedTo, dueDate } =
      req.body;

    if (!title || !description) {
      const users = await User.find({ isActive: true }).select(
        "username email role"
      );
      return res.render("records/new", {
        title: "New Record",
        users,
        message: "Title and description are required",
        messageType: "error",
        formData: req.body,
      });
    }

    const record = new Record({
      title,
      description,
      status: status || "pending",
      priority: priority || "medium",
      createdBy: req.user.id,
      assignedTo: assignedTo || req.user.id,
      dueDate: dueDate ? new Date(dueDate) : undefined,
    });

    await record.save();
    res.redirect("/records?message=Record created successfully&type=success");
  } catch (error) {
    console.error("Create record error:", error);
    const users = await User.find({ isActive: true }).select(
      "username email role"
    );
    res.render("records/new", {
      title: "New Record",
      users,
      message: "Error creating record",
      messageType: "error",
      formData: req.body,
    });
  }
};

const viewRecord = async (req, res) => {
  try {
    const { id } = req.params;

    const filter = { _id: id, isActive: true };
    if (req.user.role !== "admin") {
      filter.$or = [{ createdBy: req.user.id }, { assignedTo: req.user.id }];
    }

    const record = await Record.findOne(filter)
      .populate("createdBy", "username email role")
      .populate("assignedTo", "username email role");

    if (!record) {
      return res.render("error", {
        title: "Record Not Found",
        error: {
          status: 404,
          message: "Record not found",
        },
      });
    }

    res.render("records/view", {
      title: "View Record",
      record,
    });
  } catch (error) {
    console.error("View record error:", error);
    res.render("error", {
      title: "Error",
      error: {
        status: 500,
        message: "Error loading record",
      },
    });
  }
};

const editRecord = async (req, res) => {
  try {
    const { id } = req.params;

    const filter = { _id: id, isActive: true };
    if (!["admin", "manager"].includes(req.user.role)) {
      filter.createdBy = req.user.id;
    }

    const record = await Record.findOne(filter)
      .populate("createdBy", "username email")
      .populate("assignedTo", "username email");

    if (!record) {
      return res.render("error", {
        title: "Record Not Found",
        error: {
          status: 404,
          message: "Record not found or access denied",
        },
      });
    }

    const users = await User.find({ isActive: true }).select(
      "username email role"
    );

    res.render("records/edit", {
      title: "Edit Record",
      record,
      users,
      message: req.query.message || null,
      messageType: req.query.type || "info",
    });
  } catch (error) {
    console.error("Edit record page error:", error);
    res.render("error", {
      title: "Error",
      error: {
        status: 500,
        message: "Error loading edit page",
      },
    });
  }
};

const updateRecord = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, status, priority, assignedTo, dueDate } =
      req.body;

    const filter = { _id: id, isActive: true };
    if (!["admin", "manager"].includes(req.user.role)) {
      filter.createdBy = req.user.id;
    }

    const record = await Record.findOne(filter);

    if (!record) {
      return res.render("error", {
        title: "Record Not Found",
        error: {
          status: 404,
          message: "Record not found or access denied",
        },
      });
    }

    // Update fields
    if (title) record.title = title;
    if (description) record.description = description;
    if (status) record.status = status;
    if (priority) record.priority = priority;
    if (assignedTo) record.assignedTo = assignedTo;
    if (dueDate) record.dueDate = new Date(dueDate);

    await record.save();
    res.redirect(
      `/records/${id}?message=Record updated successfully&type=success`
    );
  } catch (error) {
    console.error("Update record error:", error);
    res.redirect(
      `/records/${req.params.id}/edit?message=Error updating record&type=error`
    );
  }
};

const deleteRecord = async (req, res) => {
  try {
    const { id } = req.params;

    const filter = { _id: id, isActive: true };
    if (req.user.role !== "admin") {
      filter.createdBy = req.user.id;
    }

    const record = await Record.findOne(filter);

    if (!record) {
      return res.render("error", {
        title: "Record Not Found",
        error: {
          status: 404,
          message: "Record not found or access denied",
        },
      });
    }

    record.isActive = false;
    await record.save();

    res.redirect("/records?message=Record deleted successfully&type=success");
  } catch (error) {
    console.error("Delete record error:", error);
    res.redirect("/records?message=Error deleting record&type=error");
  }
};

//--------------------------------------------------------------------------------------
//                            User Management
//--------------------------------------------------------------------------------------
const usersList = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;
    const role = req.query.role;
    const isActive = req.query.isActive;

    const filter = {};
    if (role) filter.role = role;
    if (isActive !== undefined) filter.isActive = isActive === "true";

    const users = await User.find(filter)
      .select("-password -refreshTokens")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await User.countDocuments(filter);

    res.render("users/list", {
      title: "Users",
      users,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalUsers: total,
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1,
      },
      filters: { role, isActive },
      message: req.query.message || null,
      messageType: req.query.type || "info",
    });
  } catch (error) {
    console.error("Users list error:", error);
    res.render("error", {
      title: "Users Error",
      error: {
        status: 500,
        message: "Error loading users",
      },
    });
  }
};

const viewUser = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id).select("-password -refreshTokens");
    if (!user) {
      return res.render("error", {
        title: "User Not Found",
        error: {
          status: 404,
          message: "User not found",
        },
      });
    }

    // Get user's records count
    const recordsCount = await Record.countDocuments({
      $or: [{ createdBy: id }, { assignedTo: id }],
      isActive: true,
    });

    res.render("users/view", {
      title: "View User",
      viewUser: user,
      recordsCount,
      message: req.query.message || null,
      messageType: req.query.type || "info",
    });
  } catch (error) {
    console.error("View user error:", error);
    res.render("error", {
      title: "Error",
      error: {
        status: 500,
        message: "Error loading user",
      },
    });
  }
};

const updateUserRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    const user = await User.findById(id);
    if (!user) {
      return res.redirect(`/users?message=User not found&type=error`);
    }

    if (user._id.toString() === req.user.id) {
      return res.redirect(
        `/users/${id}?message=Cannot change your own role&type=error`
      );
    }

    user.role = role;
    await user.save();
    await user.clearRefreshTokens();

    res.redirect(
      `/users/${id}?message=User role updated successfully&type=success`
    );
  } catch (error) {
    console.error("Update user role error:", error);
    res.redirect(
      `/users/${req.params.id}?message=Error updating user role&type=error`
    );
  }
};

const toggleUserStatus = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);
    if (!user) {
      return res.redirect(`/users?message=User not found&type=error`);
    }

    if (user._id.toString() === req.user.id) {
      return res.redirect;
      return res.redirect(
        `/users/${id}?message=Cannot change your own status&type=error`
      );
    }

    user.isActive = !user.isActive;
    await user.save();

    if (!user.isActive) {
      await user.clearRefreshTokens();
    }

    const statusText = user.isActive ? "activated" : "deactivated";
    res.redirect(
      `/users/${id}?message=User ${statusText} successfully&type=success`
    );
  } catch (error) {
    console.error("Toggle user status error:", error);
    res.redirect(
      `/users/${req.params.id}?message=Error updating user status&type=error`
    );
  }
};

//--------------------------------------------------------------------------------------
//                            Profile Management
//--------------------------------------------------------------------------------------
const profile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select(
      "-password -refreshTokens"
    );

    res.render("profile", {
      title: "My Profile",
      profileUser: user,
      message: req.query.message || null,
      messageType: req.query.type || "info",
    });
  } catch (error) {
    console.error("Profile error:", error);
    res.render("error", {
      title: "Profile Error",
      error: {
        status: 500,
        message: "Error loading profile",
      },
    });
  }
};

const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.redirect(
        "/profile?message=All password fields are required&type=error"
      );
    }

    if (newPassword !== confirmPassword) {
      return res.redirect(
        "/profile?message=New passwords do not match&type=error"
      );
    }

    if (newPassword.length < 6) {
      return res.redirect(
        "/profile?message=New password must be at least 6 characters long&type=error"
      );
    }

    const user = await User.findById(req.user.id);

    if (!(await user.comparePassword(currentPassword))) {
      return res.redirect(
        "/profile?message=Current password is incorrect&type=error"
      );
    }

    user.password = newPassword;
    await user.save();

    // Clear all refresh tokens to force re-login on other devices
    await user.clearRefreshTokens();

    res.redirect("/profile?message=Password changed successfully&type=success");
  } catch (error) {
    console.error("Change password error:", error);
    res.redirect("/profile?message=Error changing password&type=error");
  }
};

module.exports = {
  home,
  showLogin,
  handleLogin,
  showRegister,
  handleRegister,
  handleLogout,
  dashboard,
  recordsList,
  newRecord,
  createRecord,
  viewRecord,
  editRecord,
  updateRecord,
  deleteRecord,
  usersList,
  viewUser,
  updateUserRole,
  toggleUserStatus,
  profile,
  changePassword,
};
