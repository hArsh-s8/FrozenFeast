const mongoose = require("mongoose");

const orderItemSchema = new mongoose.Schema({
    _id: { type: String, required: false },
    iceName: { type: String, default: "" },
    name: { type: String, default: "" },
    price: { type: Number, required: true },
    quantity: { type: Number, required: true, default: 1 },
    iceUrl: { type: String, default: "" },
    description: { type: String, default: "" },
    tags: { type: String, default: "" }
}, { _id: false });

const orderSchema = new mongoose.Schema({
    orderId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    items: {
        type: [orderItemSchema],
        required: true,
        validate: [arr => arr.length > 0, "Order must have at least one item"]
    },
    subtotal: {
        type: Number,
        required: true
    },
    deliveryFee: {
        type: Number,
        default: 0
    },
    tax: {
        type: Number,
        default: 0
    },
    total: {
        type: Number,
        required: true
    },
    addressId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Delivery",
        required: false
    },
    deliveryAddress: {
        name: { type: String, default: "" },
        contact: { type: String, default: "" },
        streetAdd: { type: String, default: "" },
        city: { type: String, default: "" },
        pin: { type: String, default: "" },
        district: { type: String, default: "" }
    },
    paymentMethod: {
        type: String,
        enum: ["razorpay", "cod", "dummy"],
        required: true
    },
    paymentStatus: {
        type: String,
        enum: ["pending", "paid", "failed"],
        default: "pending"
    },
    paymentId: {
        type: String,
        default: null
    },
    razorpayOrderId: {
        type: String,
        default: null
    },
    razorpaySignature: {
        type: String,
        default: null
    },
    orderStatus: {
        type: String,
        enum: ["Placed", "Preparing", "Out for Delivery", "Delivered", "Cancelled"],
        default: "Placed"
    }
}, { timestamps: true });

module.exports = mongoose.model("Order", orderSchema);
