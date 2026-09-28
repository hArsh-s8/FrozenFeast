const express = require("express");
const router = express.Router();

// Models
const File = require("../models/Files");
const shopFile = require("../models/ShopFiles");

// Validation middleware & schemas
const validate = require("../middleware/validate");
const {
    signupSchema,
    loginSchema,
    updateProfileSchema,
    updateFavoritesSchema,
    createOrderSchema,
    verifyPaymentSchema,
    getOrderByIdSchema,
    createDeliverySchema,
    deleteDeliverySchema,
    imageUploadSchema,
    shopFileUploadSchema,
    paginationQuerySchema,
    shopQuerySchema
} = require("../validators/schemas");

// Auth controllers
const {
    login,
    logout,
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

// Auth Middleware
const { auth, isAdmin } = require("../middleware/auth");

// Other controllers
const { imageUpload, shopFileUpload } = require("../controller/fileUpload");
const { createDelivery, getMyDeliveries, deleteDelivery } = require("../controller/delivery");

// Google Auth controllers
const { googleAuthInit, googleAuthCallback } = require("../controller/googleAuth");

// ─── Public Auth Routes ───────────────────────────────────────────────────────
router.post("/login", validate(loginSchema), login);
router.post("/logout", logout);
router.post("/signup", validate(signupSchema), signup);
router.get("/auth/google", googleAuthInit);
router.get("/auth/google/callback", googleAuthCallback);

// ─── Profile & User Identification Routes (protected) ─────────────────────────
router.get("/profile", auth, profile);
router.get("/me", auth, profile);
router.put("/profile", validate(updateProfileSchema), auth, updateProfile);

// ─── Favorites Routes (protected) ────────────────────────────────────────────
router.put("/favorites", validate(updateFavoritesSchema), auth, updateFavorites);

// ─── Orders Routes (protected) ───────────────────────────────────────────────
router.post("/orders", validate(createOrderSchema), auth, addOrder);            // Add a new order
router.get("/orders", auth, getOrders);                                         // Get all orders
router.get("/orders/:orderId", validate(getOrderByIdSchema), auth, getOrderById); // Get single order details
router.put("/recentOrders", auth, updateRecentOrders);                           // Legacy full-replace

// ─── Payment Routes (protected) ──────────────────────────────────────────────
router.get("/payment/key", auth, getRazorpayKey);
router.post("/payment/create-order", validate(createOrderSchema), auth, createRazorpayOrder);
router.post("/payment/verify", validate(verifyPaymentSchema), auth, verifyPayment);
router.post("/payment/cod", validate(createOrderSchema), auth, createCodOrder);

// ─── Admin-Only Routes ────────────────────────────────────────────────────────
router.post("/imageUpload", validate(imageUploadSchema), auth, isAdmin, imageUpload);
router.post("/shopFileUpload", validate(shopFileUploadSchema), auth, isAdmin, shopFileUpload);

// ─── Test Protected Routes ────────────────────────────────────────────────────
router.get("/admin", auth, isAdmin, (req, res) => {
    res.json({ success: true, message: "Welcome Admin!" });
});

// ─── Delivery Routes (any authenticated user) ─────────────────────────────────
router.post("/delivery", validate(createDeliverySchema), auth, createDelivery);
router.get("/deliveries", auth, getMyDeliveries);
router.delete("/delivery/:id", validate(deleteDeliverySchema), auth, deleteDelivery);

// ─── Public Product Routes ────────────────────────────────────────────────────
router.get("/icecreams", validate(paginationQuerySchema), async (req, res) => {
    try {
        const icecreams = await File.find();
        res.json({ success: true, data: icecreams });
    } catch (error) {
        console.error("Icecreams error:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
});

// Geocoding & Distance utilities
const { geocodeLocation, calculateHaversineDistance, isValidCoordinate } = require("../utils/geocoder");

router.get("/shop", validate(shopQuerySchema), async (req, res) => {
    try {
        const { location, search, radius } = req.query;
        const allShops = await shopFile.find();

        // 1. If location search parameter is provided by customer
        if (location && typeof location === "string" && location.trim() !== "") {
            const customerCoords = await geocodeLocation(location.trim());

            if (!customerCoords) {
                return res.status(400).json({
                    success: false,
                    message: "Location could not be found. Please enter a more specific location."
                });
            }

            // Calculate Haversine distance for shops with valid coordinates
            let processedShops = allShops.map(s => {
                const shopObj = s.toObject();
                const hasValidCoords = isValidCoordinate(Number(s.latitude), Number(s.longitude));

                if (hasValidCoords) {
                    const distance = calculateHaversineDistance(
                        customerCoords.latitude,
                        customerCoords.longitude,
                        Number(s.latitude),
                        Number(s.longitude)
                    );
                    return {
                        ...shopObj,
                        hasCoordinates: true,
                        latitude: Number(s.latitude),
                        longitude: Number(s.longitude),
                        distanceKm: distance
                    };
                }

                return {
                    ...shopObj,
                    hasCoordinates: false,
                    latitude: null,
                    longitude: null,
                    distanceKm: null
                };
            });

            // Filter shops with valid coordinates
            let nearbyShops = processedShops.filter(s => s.hasCoordinates);

            // Filter by max radius if configured or requested
            const maxRadius = Number(radius) || Number(process.env.SHOP_SEARCH_RADIUS_KM) || 50;
            nearbyShops = nearbyShops.filter(s => s.distanceKm <= maxRadius);

            // Sort by nearest distance first
            nearbyShops.sort((a, b) => a.distanceKm - b.distanceKm);

            // Optional text search filter
            if (search && search.trim() !== "") {
                const q = search.trim().toLowerCase();
                nearbyShops = nearbyShops.filter(s =>
                    (s.shopName && s.shopName.toLowerCase().includes(q)) ||
                    (s.location && s.location.toLowerCase().includes(q))
                );
            }

            return res.json({
                success: true,
                customerLocation: {
                    latitude: customerCoords.latitude,
                    longitude: customerCoords.longitude,
                    displayName: customerCoords.displayName
                },
                data: nearbyShops
            });
        }

        // 2. Default request (no location query parameter)
        let processedShops = allShops.map(s => {
            const shopObj = s.toObject();
            const hasValidCoords = isValidCoordinate(Number(s.latitude), Number(s.longitude));
            return {
                ...shopObj,
                hasCoordinates: hasValidCoords,
                latitude: hasValidCoords ? Number(s.latitude) : null,
                longitude: hasValidCoords ? Number(s.longitude) : null
            };
        });

        // Optional text search filter
        if (search && search.trim() !== "") {
            const q = search.trim().toLowerCase();
            processedShops = processedShops.filter(s =>
                (s.shopName && s.shopName.toLowerCase().includes(q)) ||
                (s.location && s.location.toLowerCase().includes(q))
            );
        }

        return res.json({ success: true, data: processedShops });
    } catch (error) {
        console.error("Shop search error:", error);
        return res.status(500).json({ success: false, message: "Server error" });
    }
});

// ─── Health Check ─────────────────────────────────────────────────────────────
router.get("/test", (req, res) => {
    res.json({ success: true, message: "Server running fine!" });
});

module.exports = router;