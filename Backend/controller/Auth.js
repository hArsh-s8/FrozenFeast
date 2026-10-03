const bcrypt = require("bcrypt");
const User = require("../models/User");
const jwt = require("jsonwebtoken");
const { randomUUID } = require("crypto");

require("dotenv").config();

// ─── Signup ───────────────────────────────────────────────────────────────────
exports.signup = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        // 1. Validate required fields & non-empty content
        if (!name || typeof name !== "string" || name.trim() === "") {
            return res.status(400).json({ success: false, message: "Name is required" });
        }

        if (!email || typeof email !== "string" || email.trim() === "") {
            return res.status(400).json({ success: false, message: "Email is required" });
        }

        // Normalize email: trim + lowercase
        const normalizedEmail = email.trim().toLowerCase();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(normalizedEmail)) {
            return res.status(400).json({ success: false, message: "Please provide a valid email address" });
        }

        if (!password || typeof password !== "string" || password.length < 6) {
            return res.status(400).json({ success: false, message: "Password must be at least 6 characters long" });
        }

        // 2. Application-level duplicate check
        const existingEmail = await User.findOne({ email: normalizedEmail });
        if (existingEmail) {
            return res.status(400).json({ success: false, message: "Email already registered" });
        }

        // 3. Hash password with bcrypt
        const hashedPassword = await bcrypt.hash(password, 10);

        // 4. Create regular customer user in MongoDB
        await User.create({
            name: name.trim(),
            email: normalizedEmail,
            password: hashedPassword,
            role: "Customer"
        });

        return res.status(201).json({ success: true, message: "User created successfully" });
    } catch (error) {
        // Handle MongoDB duplicate key error (code 11000) for race conditions
        if (error.code === 11000 || (error.message && error.message.includes("E11000"))) {
            return res.status(400).json({ success: false, message: "Email already registered" });
        }

        console.error("Signup error:", error);
        return res.status(500).json({ success: false, message: "User cannot be registered. Please try later" });
    }
};

// ─── Login ────────────────────────────────────────────────────────────────────
exports.login = async (req, res) => {
    try {
        let { email, password } = req.body;
        email = email.trim().toLowerCase();

        let user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ success: false, message: "User does not exist" });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(403).json({ success: false, message: "Incorrect password" });
        }

        const payload = { email: user.email, id: user._id, role: user.role };
        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "1d" });

        user = user.toObject();
        delete user.password;

        const isProduction = process.env.NODE_ENV === "production";

        res.cookie("token", token, {
            httpOnly: true,
            secure: isProduction,
            sameSite: isProduction ? "none" : "lax",
            maxAge: 24 * 60 * 60 * 1000
        });

        return res.status(200).json({
            success: true,
            message: "Logged in successfully",
            token,
            user
        });
    } catch (error) {
        console.error("Login error:", error);
        return res.status(500).json({ success: false, message: "Login failed" });
    }
};

// ─── Logout ───────────────────────────────────────────────────────────────────
exports.logout = async (req, res) => {
    try {
        const isProduction = process.env.NODE_ENV === "production";
        res.clearCookie("token", {
            httpOnly: true,
            secure: isProduction,
            sameSite: isProduction ? "none" : "lax"
        });
        return res.status(200).json({
            success: true,
            message: "Logged out successfully"
        });
    } catch (error) {
        console.error("Logout error:", error);
        return res.status(500).json({ success: false, message: "Logout failed" });
    }
};

// ─── Get Profile ──────────────────────────────────────────────────────────────
exports.profile = async (req, res) => {
    try {
        const userId = req.user.id;
        const user = await User.findById(userId).select("-password -__v");

        if (!user) return res.status(404).json({ success: false, message: "User not found" });

        res.json({
            success: true,
            user: {
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                phone: user.phone || null,
                favorites: user.favorites || [],
                recentOrders: user.recentOrders || [],
            }
        });
    } catch (error) {
        console.error("Profile error:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

// ─── Update Profile ───────────────────────────────────────────────────────────
exports.updateProfile = async (req, res) => {
    try {
        const userId = req.user.id;
        const { name, email } = req.body;

        if (!name || !email) {
            return res.status(400).json({ success: false, message: "Name and email are required" });
        }

        const existingEmail = await User.findOne({ email: email.toLowerCase(), _id: { $ne: userId } });
        if (existingEmail) {
            return res.status(400).json({ success: false, message: "Email already in use by another account" });
        }

        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { name, email: email.toLowerCase() },
            { new: true, runValidators: true }
        ).select("-password -__v");

        if (!updatedUser) return res.status(404).json({ success: false, message: "User not found" });

        res.json({
            success: true,
            message: "Profile updated successfully",
            user: {
                _id: updatedUser._id,
                name: updatedUser.name,
                email: updatedUser.email,
                role: updatedUser.role,
                phone: updatedUser.phone || null,
            }
        });
    } catch (error) {
        console.error("Update profile error:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

// ─── Toggle / Sync Favorites ──────────────────────────────────────────────────
exports.updateFavorites = async (req, res) => {
    try {
        const userId = req.user.id;
        const { favorites } = req.body;

        if (!Array.isArray(favorites)) {
            return res.status(400).json({ success: false, message: "favorites must be an array" });
        }

        // Normalize favorites — ensure _id is a string for consistency
        const normalizedFavs = favorites.map(f => ({
            _id: String(f._id),
            iceName: f.iceName || f.name || "",
            name: f.name || f.iceName || "",
            price: Number(f.price) || 0,
            iceUrl: f.iceUrl || "",
            description: f.description || "",
            tags: f.tags || f.tag || "",
        }));

        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { $set: { favorites: normalizedFavs } },
            { new: true }
        ).select("favorites");

        if (!updatedUser) return res.status(404).json({ success: false, message: "User not found" });

        res.json({ success: true, message: "Favorites updated", favorites: updatedUser.favorites });
    } catch (error) {
        console.error("Update favorites error:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

// ─── Add a Single Order (push, max 20) ───────────────────────────────────────
exports.addOrder = async (req, res) => {
    try {
        const { calculateAuthoritativeTotals } = require("./payment");
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

        const newOrder = {
            orderId: randomUUID(),
            date: new Date(),
            items: sanitizedItems,
            subtotal,
            deliveryFee,
            tax,
            total,
            addressId: validAddressId,
            deliveryAddress: addressSnapshot,
            status: "Placed"
        };

        // Push new order to front, keep max 20 orders
        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ success: false, message: "User not found" });

        user.recentOrders.unshift(newOrder);
        if (user.recentOrders.length > 20) {
            user.recentOrders = user.recentOrders.slice(0, 20);
        }
        user.markModified('recentOrders');
        await user.save();

        res.status(201).json({
            success: true,
            message: "Order placed successfully",
            order: newOrder,
            recentOrders: user.recentOrders
        });
    } catch (error) {
        console.error("Add order error:", error.message || error);
        const status = error.statusCode || 500;
        res.status(status).json({ success: false, message: error.message || "Server error" });
    }
};

// ─── Get Recent Orders ────────────────────────────────────────────────────────
exports.getOrders = async (req, res) => {
    try {
        const userId = req.user.id;
        const user = await User.findById(userId).select("recentOrders");

        if (!user) return res.status(404).json({ success: false, message: "User not found" });

        res.json({ success: true, recentOrders: user.recentOrders || [] });
    } catch (error) {
        console.error("Get orders error:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

// ─── Legacy: Full recentOrders replace (kept for compat) ─────────────────────
exports.updateRecentOrders = async (req, res) => {
    try {
        const userId = req.user.id;
        const { recentOrders } = req.body;

        if (!Array.isArray(recentOrders)) {
            return res.status(400).json({ success: false, message: "recentOrders must be an array" });
        }

        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { $set: { recentOrders } },
            { new: true }
        ).select("recentOrders");

        if (!updatedUser) return res.status(404).json({ success: false, message: "User not found" });

        res.json({ success: true, recentOrders: updatedUser.recentOrders });
    } catch (error) {
        console.error("Update recent orders error:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};