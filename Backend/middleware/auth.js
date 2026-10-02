const jwt = require("jsonwebtoken");
require("dotenv").config();
const User = require('../models/User');

// Original exports (if used elsewhere)
exports.auth = (req, res, next) => {
  try {
    let token = null;

    if (req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
      token = req.headers.authorization.split(" ")[1];
    } else if (req.body.token) {
      token = req.body.token;
    } else if (req.cookies?.token) {
      token = req.cookies.token;
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Token missing. Please login first.",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // Decoded token (lightweight, no DB fetch) 123

    next();
  } catch (error) {
    console.error("Auth middleware error:", error.message);
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token",
    });
  }
};

exports.isAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }
  if (req.user.role !== "Admin") {
    return res.status(403).json({ success: false, message: "Access denied. Admins only." });
  }
  next();
};

exports.isCustomer = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }
  if (req.user.role !== "Customer") {
    return res.status(403).json({ success: false, message: "Access denied. Customers only." });
  }
  next();
};

// Enhanced async middleware (fetches full user from DB) - Use this for profile routes
exports.authMiddleware = async (req, res, next) => {
    try {
        let token;
        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        } else if (req.cookies.token) { // Fallback for cookies
            token = req.cookies.token;
        }

        if (!token) {
            return res.status(401).json({ success: false, message: 'No token provided' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id).select('-password -__v'); // Fetch full user, exclude sensitive fields
        if (!user) {
            return res.status(401).json({ success: false, message: 'User not found' });
        }

        req.user = user; // Full user object
        next();
    } catch (error) {
        console.error('Auth error:', error);
        res.status(401).json({ success: false, message: 'Invalid token' });
    }
};

//module.exports = authMiddleware; // Export the async middleware as default