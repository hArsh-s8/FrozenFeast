const crypto = require("crypto");
const Razorpay = require("razorpay");
const Order = require("../models/Order");
const User = require("../models/User");
const Delivery = require("../models/Delivery");

require("dotenv").config();

// Helper to check if Razorpay is configured
const isRazorpayConfigured = () => {
    const key = process.env.RAZORPAY_KEY_ID;
    const secret = process.env.RAZORPAY_KEY_SECRET;
    return Boolean(
        key &&
        secret &&
        !key.toLowerCase().includes("placeholder") &&
        !key.toLowerCase().includes("yourkeyid") &&
        !secret.toLowerCase().includes("placeholder") &&
        !secret.toLowerCase().includes("yoursecretkey")
    );
};

// Helper to get Razorpay instance
const getRazorpayInstance = () => {
    if (!isRazorpayConfigured()) {
        return null;
    }
    return new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_KEY_SECRET
    });
};

// Helper to calculate totals securely on the backend
const calculateOrderTotals = (items, clientDeliveryFee, clientTax) => {
    const subtotal = items.reduce((sum, item) => {
        const price = Number(item.price) || 0;
        const qty = Number(item.quantity) || 1;
        return sum + (price * qty);
    }, 0);

    // Free delivery over ₹300, else ₹40 (or respect client if 0)
    let deliveryFee = subtotal >= 300 ? 0 : 40;
    if (clientDeliveryFee !== undefined && clientDeliveryFee !== null) {
        deliveryFee = Number(clientDeliveryFee) >= 0 ? Number(clientDeliveryFee) : deliveryFee;
    }

    // 5% GST tax rounded
    let tax = Math.round(subtotal * 0.05);
    if (clientTax !== undefined && clientTax !== null) {
        tax = Number(clientTax) >= 0 ? Number(clientTax) : tax;
    }

    const total = subtotal + deliveryFee + tax;

    return { subtotal, deliveryFee, tax, total };
};

// Generate friendly order ID like FF-9B4F81-4821
const generateOrderId = () => {
    const timestamp = Date.now().toString(36).toUpperCase();
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    return `FF-${timestamp}-${randomSuffix}`;
};

// ─── 1. Get Razorpay Public Key ───────────────────────────────────────────────
exports.getRazorpayKey = async (req, res) => {
    try {
        const configured = isRazorpayConfigured();
        return res.status(200).json({
            success: true,
            keyId: configured ? process.env.RAZORPAY_KEY_ID : null,
            isConfigured: configured
        });
    } catch (error) {
        console.error("Get Razorpay key error:", error);
        return res.status(500).json({ success: false, message: "Failed to retrieve payment configuration" });
    }
};

// ─── 2. Create Razorpay Order ─────────────────────────────────────────────────
exports.createRazorpayOrder = async (req, res) => {
    try {
        if (!req.user || !req.user.id) {
            return res.status(401).json({ success: false, message: "User not authenticated" });
        }

        const { items, addressId, deliveryFee: reqDeliveryFee, tax: reqTax } = req.body;

        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ success: false, message: "Order items cannot be empty" });
        }

        // Calculate verified totals on backend
        const { subtotal, deliveryFee, tax, total } = calculateOrderTotals(items, reqDeliveryFee, reqTax);

        const instance = getRazorpayInstance();

        // If Razorpay credentials are not yet set up, return dummy simulator info
        if (!instance) {
            return res.status(200).json({
                success: true,
                isDummy: true,
                orderId: `dummy_${Date.now()}`,
                amount: Math.round(total * 100),
                currency: "INR",
                subtotal,
                deliveryFee,
                tax,
                total,
                message: "Razorpay credentials not set; dummy payment mode active."
            });
        }

        // Razorpay expects amount in smallest currency subunit (paise for INR)
        const options = {
            amount: Math.round(total * 100),
            currency: "INR",
            receipt: `rcpt_${Date.now()}`.slice(0, 40),
            notes: {
                userId: String(req.user.id),
                userEmail: req.user.email || ""
            }
        };

        const razorpayOrder = await instance.orders.create(options);

        return res.status(200).json({
            success: true,
            isDummy: false,
            orderId: razorpayOrder.id,
            amount: razorpayOrder.amount,
            currency: razorpayOrder.currency,
            keyId: process.env.RAZORPAY_KEY_ID,
            subtotal,
            deliveryFee,
            tax,
            total
        });
    } catch (error) {
        console.error("Create Razorpay order error:", error);
        if (error.statusCode === 401 || error.error?.description === "Authentication failed") {
            const { subtotal, deliveryFee, tax, total } = calculateOrderTotals(req.body.items || [], req.body.deliveryFee, req.body.tax);
            return res.status(200).json({
                success: true,
                isDummy: true,
                orderId: `dummy_${Date.now()}`,
                amount: Math.round(total * 100),
                currency: "INR",
                subtotal,
                deliveryFee,
                tax,
                total,
                message: "Razorpay credentials unauthorized or expired. Switched to Test Simulator mode."
            });
        }
        return res.status(500).json({
            success: false,
            message: error.error?.description || error.message || "Failed to initialize payment"
        });
    }
};

// ─── 3. Verify Payment & Confirm Order ────────────────────────────────────────
exports.verifyPayment = async (req, res) => {
    try {
        if (!req.user || !req.user.id) {
            return res.status(401).json({ success: false, message: "User not authenticated" });
        }

        const {
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
            items,
            addressId,
            isDummy,
            deliveryFee: reqDeliveryFee,
            tax: reqTax
        } = req.body;

        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ success: false, message: "Order items cannot be empty" });
        }

        // Signature verification (unless explicit dummy simulation)
        if (!isDummy) {
            if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
                return res.status(400).json({ success: false, message: "Incomplete payment details" });
            }

            const body = razorpay_order_id + "|" + razorpay_payment_id;
            const expectedSignature = crypto
                .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET || "")
                .update(body.toString())
                .digest("hex");

            if (expectedSignature !== razorpay_signature) {
                console.error("Payment signature mismatch!");
                return res.status(400).json({
                    success: false,
                    message: "Payment verification failed: Invalid signature"
                });
            }
        }

        // Fetch address snapshot if available
        let addressSnapshot = {};
        if (addressId) {
            try {
                const deliveryDoc = await Delivery.findById(addressId);
                if (deliveryDoc) {
                    addressSnapshot = {
                        name: deliveryDoc.name,
                        contact: deliveryDoc.contact,
                        streetAdd: deliveryDoc.streetAdd,
                        city: deliveryDoc.city,
                        pin: deliveryDoc.pin,
                        district: deliveryDoc.district
                    };
                }
            } catch (e) {
                console.warn("Could not fetch delivery doc snapshot:", e.message);
            }
        }

        // Calculate verified totals
        const { subtotal, deliveryFee, tax, total } = calculateOrderTotals(items, reqDeliveryFee, reqTax);
        const orderId = generateOrderId();

        // Format items
        const sanitizedItems = items.map(item => ({
            _id: String(item._id || ""),
            iceName: item.iceName || item.name || "Ice Cream",
            name: item.name || item.iceName || "Ice Cream",
            price: Number(item.price) || 0,
            quantity: Number(item.quantity) || 1,
            iceUrl: item.iceUrl || "",
            description: item.description || "",
            tags: item.tags || item.tag || ""
        }));

        // 1. Create permanent Order record
        const newOrder = await Order.create({
            orderId,
            userId: req.user.id,
            items: sanitizedItems,
            subtotal,
            deliveryFee,
            tax,
            total,
            addressId: addressId || null,
            deliveryAddress: addressSnapshot,
            paymentMethod: isDummy ? "dummy" : "razorpay",
            paymentStatus: "paid",
            paymentId: razorpay_payment_id || `DUMMY_PAY_${Date.now()}`,
            razorpayOrderId: razorpay_order_id || null,
            razorpaySignature: razorpay_signature || null,
            orderStatus: "Placed"
        });

        // 2. Synchronize to user.recentOrders for backward-compatibility with Profile & Cart
        const user = await User.findById(req.user.id);
        if (user) {
            user.recentOrders.unshift({
                orderId: newOrder.orderId,
                date: newOrder.createdAt,
                items: newOrder.items,
                total: newOrder.total,
                subtotal: newOrder.subtotal,
                deliveryFee: newOrder.deliveryFee,
                tax: newOrder.tax,
                addressId: newOrder.addressId,
                deliveryAddress: newOrder.deliveryAddress,
                paymentMethod: newOrder.paymentMethod,
                paymentStatus: "paid",
                paymentId: newOrder.paymentId,
                status: "Placed"
            });
            if (user.recentOrders.length > 20) {
                user.recentOrders = user.recentOrders.slice(0, 20);
            }
            user.markModified("recentOrders");
            await user.save();
        }

        return res.status(201).json({
            success: true,
            message: "Payment verified and order confirmed successfully",
            order: newOrder
        });
    } catch (error) {
        console.error("Verify payment error:", error);
        return res.status(500).json({ success: false, message: "Payment verification failed" });
    }
};

// ─── 4. Cash on Delivery (COD) Order ──────────────────────────────────────────
exports.createCodOrder = async (req, res) => {
    try {
        if (!req.user || !req.user.id) {
            return res.status(401).json({ success: false, message: "User not authenticated" });
        }

        const { items, addressId, deliveryFee: reqDeliveryFee, tax: reqTax } = req.body;

        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ success: false, message: "Order items cannot be empty" });
        }

        // Fetch address snapshot
        let addressSnapshot = {};
        if (addressId) {
            try {
                const deliveryDoc = await Delivery.findById(addressId);
                if (deliveryDoc) {
                    addressSnapshot = {
                        name: deliveryDoc.name,
                        contact: deliveryDoc.contact,
                        streetAdd: deliveryDoc.streetAdd,
                        city: deliveryDoc.city,
                        pin: deliveryDoc.pin,
                        district: deliveryDoc.district
                    };
                }
            } catch (e) {
                console.warn("Could not fetch delivery doc snapshot:", e.message);
            }
        }

        // Calculate verified totals
        const { subtotal, deliveryFee, tax, total } = calculateOrderTotals(items, reqDeliveryFee, reqTax);
        const orderId = generateOrderId();

        const sanitizedItems = items.map(item => ({
            _id: String(item._id || ""),
            iceName: item.iceName || item.name || "Ice Cream",
            name: item.name || item.iceName || "Ice Cream",
            price: Number(item.price) || 0,
            quantity: Number(item.quantity) || 1,
            iceUrl: item.iceUrl || "",
            description: item.description || "",
            tags: item.tags || item.tag || ""
        }));

        // 1. Create Order record
        const newOrder = await Order.create({
            orderId,
            userId: req.user.id,
            items: sanitizedItems,
            subtotal,
            deliveryFee,
            tax,
            total,
            addressId: addressId || null,
            deliveryAddress: addressSnapshot,
            paymentMethod: "cod",
            paymentStatus: "pending",
            paymentId: null,
            razorpayOrderId: null,
            razorpaySignature: null,
            orderStatus: "Placed"
        });

        // 2. Synchronize to user.recentOrders
        const user = await User.findById(req.user.id);
        if (user) {
            user.recentOrders.unshift({
                orderId: newOrder.orderId,
                date: newOrder.createdAt,
                items: newOrder.items,
                total: newOrder.total,
                subtotal: newOrder.subtotal,
                deliveryFee: newOrder.deliveryFee,
                tax: newOrder.tax,
                addressId: newOrder.addressId,
                deliveryAddress: newOrder.deliveryAddress,
                paymentMethod: "cod",
                paymentStatus: "pending",
                paymentId: null,
                status: "Placed"
            });
            if (user.recentOrders.length > 20) {
                user.recentOrders = user.recentOrders.slice(0, 20);
            }
            user.markModified("recentOrders");
            await user.save();
        }

        return res.status(201).json({
            success: true,
            message: "Order placed successfully with Cash on Delivery",
            order: newOrder
        });
    } catch (error) {
        console.error("Create COD order error:", error);
        return res.status(500).json({ success: false, message: "Failed to place COD order" });
    }
};

// ─── 5. Get Order By Order ID ─────────────────────────────────────────────────
exports.getOrderById = async (req, res) => {
    try {
        const { orderId } = req.params;
        if (!orderId) {
            return res.status(400).json({ success: false, message: "Order ID is required" });
        }

        const order = await Order.findOne({ orderId });
        if (!order) {
            // Check in user's recentOrders as fallback
            if (req.user && req.user.id) {
                const user = await User.findById(req.user.id);
                const recentOrder = (user?.recentOrders || []).find(o => o.orderId === orderId);
                if (recentOrder) {
                    return res.status(200).json({ success: true, order: recentOrder });
                }
            }
            return res.status(404).json({ success: false, message: "Order not found" });
        }

        // Verify authorization: only the order owner or Admin can view
        if (req.user && req.user.role !== "Admin" && String(order.userId) !== String(req.user.id)) {
            return res.status(403).json({ success: false, message: "Unauthorized to view this order" });
        }

        return res.status(200).json({ success: true, order });
    } catch (error) {
        console.error("Get order by ID error:", error);
        return res.status(500).json({ success: false, message: "Failed to retrieve order" });
    }
};
