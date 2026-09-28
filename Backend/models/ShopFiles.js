const mongoose = require("mongoose");

const shopFilesSchema = new mongoose.Schema({
    shopName: {
        type: String,
        required: true,
        trim: true,
    },
    shopImageUrl: {
        type: String,
        required: true,
    },
    location: {
        type: String,
        required: true,
        trim: true,
    },
    rating: {
        type: String,
        required: true,
    },
    latitude: {
        type: Number,
        required: false,
    },
    longitude: {
        type: Number,
        required: false,
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: false,
    }
}, { timestamps: true });

const shopFile = mongoose.model("shopFile", shopFilesSchema);
module.exports = shopFile;