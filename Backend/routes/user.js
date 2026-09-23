const express = require("express");
const router = express.Router();

// Models
const File = require("../models/Files");
const shopFile = require("../models/ShopFiles");

// Auth controllers
const {
    login,
    signup,
    profile,
    updateProfile,
    updateFavorites,
    addOrder,
    getOrders,
    updateRecentOrders
} = require("../controller/Auth");

// Payment controllers
const {
    getRazorpayKey,
    createRazorpayOrder,
    verifyPayment,
    createCodOrder,
    getOrderById
} = require("../controller/payment");

// Middleware
const { auth, isAdmin } = require("../middleware/auth");

// Other controllers
const { imageUpload, shopFileUpload } = require("../controller/fileUpload");
const { createDelivery, getMyDeliveries, deleteDelivery } = require("../controller/delivery");

// ─── Public Auth Routes ───────────────────────────────────────────────────────
router.post("/login", login);
router.post("/signup", signup);

// ─── Profile Routes (auth handled internally) ─────────────────────────────────
router.get("/profile", profile);
router.put("/profile", updateProfile);

// ─── Favorites Routes (protected) ────────────────────────────────────────────
router.put("/favorites", auth, updateFavorites);

// ─── Orders Routes (protected) ───────────────────────────────────────────────
router.post("/orders", auth, addOrder);          // Add a new order
router.get("/orders", auth, getOrders);           // Get all orders
router.get("/orders/:orderId", auth, getOrderById); // Get single order details
router.put("/recentOrders", auth, updateRecentOrders); // Legacy full-replace

// ─── Payment Routes (protected) ──────────────────────────────────────────────
router.get("/payment/key", auth, getRazorpayKey);
router.post("/payment/create-order", auth, createRazorpayOrder);
router.post("/payment/verify", auth, verifyPayment);
router.post("/payment/cod", auth, createCodOrder);

// ─── Admin-Only Routes ────────────────────────────────────────────────────────
router.post("/imageUpload", auth, isAdmin, imageUpload);
router.post("/shopFileUpload", auth, isAdmin, shopFileUpload);

// ─── Test Protected Routes ────────────────────────────────────────────────────
router.get("/admin", auth, isAdmin, (req, res) => {
    res.json({ success: true, message: "Welcome Admin!" });
});

// ─── Delivery Routes (any authenticated user) ─────────────────────────────────
router.post("/delivery", auth, createDelivery);
router.get("/deliveries", auth, getMyDeliveries);
router.delete("/delivery/:id", auth, deleteDelivery);

// ─── Public Product Routes ────────────────────────────────────────────────────
router.get("/icecreams", async (req, res) => {
    try {
        const icecreams = await File.find();
        res.json({ success: true, data: icecreams });
    } catch (error) {
        console.error("Icecreams error:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
});

router.get("/shop", async (req, res) => {
    try {
        const shop = await shopFile.find();
        res.json({ success: true, data: shop });
    } catch (error) {
        console.error("Shop error:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
});

// ─── Health Check ─────────────────────────────────────────────────────────────
router.get("/test", (req, res) => {
    res.json({ success: true, message: "Server running fine!" });
});

module.exports = router;