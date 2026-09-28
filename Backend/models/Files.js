const mongoose = require("mongoose");

const fileSchema = new mongoose.Schema({
    iceName: {
        type: String,
        required: true,
        trim: true,
    },
    iceUrl: {
        type: String,
        required: true,
    },
    tags: {
        type: String,
        required: true,
    },
    description: {
        type: String,
        required: true,
    },
    price: {
        type: String,
        required: true,
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: false,
    }
}, { timestamps: true });

const File = mongoose.model("File", fileSchema);
module.exports = File;