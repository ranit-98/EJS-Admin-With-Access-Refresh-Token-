//--------------------------------------------------------------------------------------
//                            Web Middleware (Server-side Rendering)
//--------------------------------------------------------------------------------------

const jwt = require("jsonwebtoken");
const User = require("../models/user");
const Role = require("../models/role");

//--------------------------------------------------------------------------------------
//                            Verify Token for Web Routes
//--------------------------------------------------------------------------------------
const verifyTokenWeb = async (req, res, next) => {
  let accessToken = req.cookies.accessToken;
  let refreshToken = req.cookies.refreshToken;

  try {
    // Step 1: Try to verify access token
    if (accessToken) {
      const decoded = jwt.verify(accessToken, process.env.JWT_SECRET);
      const user = await User.findById(decoded.userId).select(
        "-password -refreshTokens"
      );

      if (user && user.isActive) {
        req.user = user;
        res.locals.user = user;
        return next();
      } else {
        res.clearCookie("accessToken");
        res.clearCookie("refreshToken");
        return res.redirect(
          "/login?message=Account not found or inactive&type=error"
        );
      }
    }

    // Step 2: Access token missing or expired — try refresh token
    if (refreshToken) {
      try {
        const decoded = jwt.verify(
          refreshToken,
          process.env.JWT_REFRESH_SECRET
        );
        const user = await User.findOne({
          _id: decoded.userId,
          "refreshTokens.token": refreshToken,
          isActive: true,
        }).select("-password -refreshTokens");

        if (user) {
          // Generate and set new access token
          const newAccessToken = user.generateAccessToken();
          res.cookie("accessToken", newAccessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            maxAge: 15 * 60 * 1000, // 15 minutes
          });

          req.user = user;
          res.locals.user = user;
          return next();
        }
      } catch (err) {
        // Refresh token invalid
      }
    }

    // Step 3: Both tokens failed
    res.clearCookie("accessToken");
    res.clearCookie("refreshToken");
    return res.redirect(
      "/login?message=Session expired. Please login again&type=warning"
    );
  } catch (error) {
    if (error.name === "TokenExpiredError" && refreshToken) {
      try {
        const decoded = jwt.verify(
          refreshToken,
          process.env.JWT_REFRESH_SECRET
        );
        const user = await User.findOne({
          _id: decoded.userId,
          "refreshTokens.token": refreshToken,
          isActive: true,
        }).select("-password -refreshTokens");

        if (user) {
          const newAccessToken = user.generateAccessToken();
          res.cookie("accessToken", newAccessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            maxAge: 15 * 60 * 1000, // 15 minutes
          });

          req.user = user;
          res.locals.user = user;
          return next();
        }
      } catch (refreshError) {
        // Refresh token failed
      }
    }

    res.clearCookie("accessToken");
    res.clearCookie("refreshToken");
    return res.redirect(
      "/login?message=Session expired. Please login again&type=warning"
    );
  }
};

//--------------------------------------------------------------------------------------
//                            Check Permission for Web Routes
//--------------------------------------------------------------------------------------

const checkPermissionWeb = (permission) => {
  return (req, res, next) => {
    try {
      const roleInstance = new Role(); // Create an instance of the class
      const permissions = roleInstance.getPermissionsByRole(req.user.role); // Get permissions for user's role

      if (!permissions.includes(permission)) {
        return res.status(403).render("error", {
          title: "Access Denied",
          error: {
            status: 403,
            message: "You do not have permission to access this resource.",
          },
        });
      }

      next();
    } catch (error) {
      console.error("Permission check error:", error);
      return res.status(500).render("error", {
        title: "Server Error",
        error: {
          status: 500,
          message: "An error occurred while checking permissions.",
        },
      });
    }
  };
};

//--------------------------------------------------------------------------------------
//                            Check Role for Web Routes
//--------------------------------------------------------------------------------------
const checkRoleWeb = (roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).render("error", {
        title: "Access Denied",
        error: {
          status: 403,
          message: "Your role does not have access to this resource.",
        },
      });
    }
    next();
  };
};

module.exports = {
  verifyTokenWeb,
  checkPermissionWeb,
  checkRoleWeb,
};
