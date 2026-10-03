const crypto = require("crypto");
const Razorpay = require("razorpay");
const mongoose = require("mongoose");
const Order = require("../models/Order");
const User = require("../models/User");
const Delivery = require("../models/Delivery");
const File = require("../models/Files");

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

/**
 * Authoritative Server-Side Pricing & Validation Helper
 * Fetches product prices directly from MongoDB (File model).
 * Validates quantity (positive integer <= 100).
 * Calculates subtotal, delivery fee (free over ₹300, else ₹40), and 5% GST tax.
 * Verifies address ownership against req.user.
 */
const calculateAuthoritativeTotals = async (rawItems, addressId, reqUser) => {
    if (!rawItems || !Array.isArray(rawItems) || rawItems.length === 0) {
        throw { statusCode: 400, message: "Order items cannot be empty" };
    }

    let subtotal = 0;
    const sanitizedItems = [];

    for (const item of rawItems) {
        const productId = item._id || item.id;
        if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
            throw { statusCode: 400, message: `Invalid product ID: ${productId}` };
        }

        const quantity = Number(item.quantity);
        if (!Number.isInteger(quantity) || quantity < 1 || quantity > 100) {
            throw { statusCode: 400, message: `Invalid quantity for product ${productId}. Must be a positive integer (max 100)` };
        }

        const product = await File.findById(productId);
        if (!product) {
            throw { statusCode: 404, message: `Product not found: ${productId}` };
        }

        const dbPrice = Number(product.price);
        if (isNaN(dbPrice) || dbPrice < 0) {
            throw { statusCode: 500, message: `Invalid product price configured` };
        }

        const itemSubtotal = dbPrice * quantity;
        subtotal += itemSubtotal;

        sanitizedItems.push({
            _id: String(product._id),
            iceName: product.iceName || product.name || "Ice Cream",
            name: product.iceName || product.name || "Ice Cream",
            price: dbPrice,
            quantity: quantity,
            iceUrl: product.iceUrl || "",
            description: product.description || "",
            tags: product.tags || ""
        });
    }

    // Business Rules:
    // Free delivery over ₹300, else ₹40
    const deliveryFee = subtotal >= 300 || subtotal === 0 ? 0 : 40;

    // 5% GST tax rounded
    const tax = Math.round(subtotal * 0.05);

    // Final Total
    const total = subtotal + deliveryFee + tax;

    // Address Ownership Verification
    let addressSnapshot = {};
    let validAddressId = null;

    if (addressId) {
        if (!mongoose.Types.ObjectId.isValid(addressId)) {
            throw { statusCode: 400, message: "Invalid address ID format" };
        }

        const deliveryDoc = await Delivery.findById(addressId);
        if (!deliveryDoc) {
            throw { statusCode: 404, message: "Delivery address not found" };
        }

        // Check ownership by userId or email
        const isOwner =
            (deliveryDoc.userId && String(deliveryDoc.userId) === String(reqUser.id)) ||
            (deliveryDoc.email && reqUser.email && deliveryDoc.email.toLowerCase() === reqUser.email.toLowerCase());

        if (!isOwner) {
            throw { statusCode: 403, message: "Unauthorized address ID. Address does not belong to authenticated user." };
        }

        validAddressId = deliveryDoc._id;
        addressSnapshot = {
            name: deliveryDoc.name || "",
            contact: deliveryDoc.contact || "",
            streetAdd: deliveryDoc.streetAdd || "",
            city: deliveryDoc.city || "",
            pin: deliveryDoc.pin || "",
            district: deliveryDoc.district || ""
        };
    }

    return {
        subtotal,
        deliveryFee,
        tax,
        total,
        sanitizedItems,
        addressId: validAddressId,
        addressSnapshot
    };
};

exports.calculateAuthoritativeTotals = calculateAuthoritativeTotals;

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

        const { items, addressId } = req.body;

        const {
            subtotal,
            deliveryFee,
            tax,
            total,
            sanitizedItems,
            addressId: validAddressId,
            addressSnapshot
        } = await calculateAuthoritativeTotals(items, addressId, req.user);

        const instance = getRazorpayInstance();
        const razorpayAmountInPaise = Math.round(total * 100);

        if (!instance) {
            // Dummy / Sandbox mode fallback
            const dummyOrderId = `dummy_${Date.now()}`;

            await Order.create({
                orderId: generateOrderId(),
                userId: req.user.id,
                items: sanitizedItems,
                subtotal,
                deliveryFee,
                tax,
                total,
                addressId: validAddressId,
                deliveryAddress: addressSnapshot,
                paymentMethod: "dummy",
                paymentStatus: "pending",
                razorpayOrderId: dummyOrderId,
                orderStatus: "Placed"
            });

            return res.status(200).json({
                success: true,
                isDummy: true,
                orderId: dummyOrderId,
                amount: razorpayAmountInPaise,
                currency: "INR",
                subtotal,
                deliveryFee,
                tax,
                total,
                message: "Razorpay test keys not set; test simulator mode active."
            });
        }

        // Razorpay test order creation
        const options = {
            amount: razorpayAmountInPaise,
            currency: "INR",
            receipt: `rcpt_${Date.now()}`.slice(0, 40),
            notes: {
                userId: String(req.user.id),
                userEmail: req.user.email || "",
                expectedTotal: String(total)
            }
        };

        const razorpayOrder = await instance.orders.create(options);

        // Pre-create order doc in DB to bind expected total & details
        await Order.create({
            orderId: generateOrderId(),
            userId: req.user.id,
            items: sanitizedItems,
            subtotal,
            deliveryFee,
            tax,
            total,
            addressId: validAddressId,
            deliveryAddress: addressSnapshot,
            paymentMethod: "razorpay",
            paymentStatus: "pending",
            razorpayOrderId: razorpayOrder.id,
            orderStatus: "Placed"
        });

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
        console.error("Create Razorpay order error:", error.message || error);
        const status = error.statusCode || 500;
        return res.status(status).json({
            success: false,
            message: error.message || "Failed to initialize payment"
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
            isDummy
        } = req.body;

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

        // Look for pre-created pending Order for this razorpay_order_id
        let orderDoc = null;
        if (razorpay_order_id) {
            orderDoc = await Order.findOne({ razorpayOrderId: razorpay_order_id, userId: req.user.id });
        }

        if (orderDoc) {
            // Pre-created order found: mark as paid
            orderDoc.paymentStatus = "paid";
            orderDoc.paymentId = razorpay_payment_id || `DUMMY_PAY_${Date.now()}`;
            orderDoc.razorpaySignature = razorpay_signature || null;
            await orderDoc.save();
        } else {
            // Fallback: calculate authoritative totals
            const {
                subtotal,
                deliveryFee,
                tax,
                total,
                sanitizedItems,
                addressId: validAddressId,
                addressSnapshot
            } = await calculateAuthoritativeTotals(items, addressId, req.user);

            const orderId = generateOrderId();
            orderDoc = await Order.create({
                orderId,
                userId: req.user.id,
                items: sanitizedItems,
                subtotal,
                deliveryFee,
                tax,
                total,
                addressId: validAddressId,
                deliveryAddress: addressSnapshot,
                paymentMethod: isDummy ? "dummy" : "razorpay",
                paymentStatus: "paid",
                paymentId: razorpay_payment_id || `DUMMY_PAY_${Date.now()}`,
                razorpayOrderId: razorpay_order_id || null,
                razorpaySignature: razorpay_signature || null,
                orderStatus: "Placed"
            });
        }

        // Sync to user.recentOrders
        const user = await User.findById(req.user.id);
        if (user) {
            user.recentOrders = user.recentOrders.filter(o => o.orderId !== orderDoc.orderId);
            user.recentOrders.unshift({
                orderId: orderDoc.orderId,
                date: orderDoc.createdAt,
                items: orderDoc.items,
                total: orderDoc.total,
                subtotal: orderDoc.subtotal,
                deliveryFee: orderDoc.deliveryFee,
                tax: orderDoc.tax,
                addressId: orderDoc.addressId,
                deliveryAddress: orderDoc.deliveryAddress,
                paymentMethod: orderDoc.paymentMethod,
                paymentStatus: "paid",
                paymentId: orderDoc.paymentId,
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
            order: orderDoc
        });
    } catch (error) {
        console.error("Verify payment error:", error.message || error);
        const status = error.statusCode || 500;
        return res.status(status).json({ success: false, message: error.message || "Payment verification failed" });
    }
};

// ─── 4. Cash on Delivery (COD) Order ──────────────────────────────────────────
exports.createCodOrder = async (req, res) => {
    try {
        if (!req.user || !req.user.id) {
            return res.status(401).json({ success: false, message: "User not authenticated" });
        }

        const { items, addressId } = req.body;

        const {
            subtotal,
            deliveryFee,
            tax,
            total,
            sanitizedItems,
            addressId: validAddressId,
            addressSnapshot
        } = await calculateAuthoritativeTotals(items, addressId, req.user);

        const orderId = generateOrderId();

        const newOrder = await Order.create({
            orderId,
            userId: req.user.id,
            items: sanitizedItems,
            subtotal,
            deliveryFee,
            tax,
            total,
            addressId: validAddressId,
            deliveryAddress: addressSnapshot,
            paymentMethod: "cod",
            paymentStatus: "pending",
            paymentId: null,
            razorpayOrderId: null,
            razorpaySignature: null,
            orderStatus: "Placed"
        });

        // Sync to user.recentOrders
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
        console.error("Create COD order error:", error.message || error);
        const status = error.statusCode || 500;
        return res.status(status).json({ success: false, message: error.message || "Failed to place COD order" });
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
            if (req.user && req.user.id) {
                const user = await User.findById(req.user.id);
                const recentOrder = (user?.recentOrders || []).find(o => o.orderId === orderId);
                if (recentOrder) {
                    return res.status(200).json({ success: true, order: recentOrder });
                }
            }
            return res.status(404).json({ success: false, message: "Order not found" });
        }

        if (req.user && req.user.role !== "Admin" && String(order.userId) !== String(req.user.id)) {
            return res.status(403).json({ success: false, message: "Unauthorized to view this order" });
        }

        return res.status(200).json({ success: true, order });
    } catch (error) {
        console.error("Get order by ID error:", error);
        return res.status(500).json({ success: false, message: "Failed to retrieve order" });
    }
};

