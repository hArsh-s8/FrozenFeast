const jwt = require("jsonwebtoken");
require("dotenv").config();

/**
 * Centralized Authentication Middleware
 * Extracts JWT from Authorization header ("Bearer <token>"), cookies ("token"), or body ("token").
 * Verifies token using process.env.JWT_SECRET.
 * Attaches decoded user payload to req.user (normalizing id and _id).
 * Returns HTTP 401 for missing, invalid, or expired tokens.
 */
exports.auth = (req, res, next) => {
  try {
    let token = null;

    if (req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
      token = req.headers.authorization.split(" ")[1];
    } else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    } else if (req.body && req.body.token) {
      token = req.body.token;
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Token missing. Please login first.",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Attach user identity to req.user (ensuring both id and _id are accessible)
    req.user = {
      ...decoded,
      id: decoded.id || decoded._id,
      _id: decoded.id || decoded._id,
    };

    next();
  } catch (error) {
    console.error("Auth middleware error:", error.name || error.message);
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token",
    });
  }
};

/**
 * Role-Based Authorization Middleware - Admin
 */
exports.isAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }
  if (req.user.role !== "Admin") {
    return res.status(403).json({ success: false, message: "Access denied. Admins only." });
  }
  next();
};

/**
 * Role-Based Authorization Middleware - Customer
 */
exports.isCustomer = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }
  if (req.user.role !== "Customer") {
    return res.status(403).json({ success: false, message: "Access denied. Customers only." });
  }
  next();
};