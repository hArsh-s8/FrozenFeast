const File = require("../models/Files");
const shopFile = require("../models/ShopFiles");
const cloudinary = require("cloudinary").v2;
const { geocodeLocation } = require("../utils/geocoder");

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const SUPPORTED_EXTENSIONS = ["png", "jpg", "jpeg", "webp"];
const SUPPORTED_MIME_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/webp"];

function isFileValid(file) {
    if (!file) return { valid: false, message: "File is required" };
    
    // Size check
    if (file.size > MAX_FILE_SIZE) {
        return { valid: false, message: "File size exceeds 5 MB limit" };
    }

    // Extension check
    const fileExt = file.name ? file.name.split('.').pop().toLowerCase() : "";
    if (!SUPPORTED_EXTENSIONS.includes(fileExt)) {
        return { valid: false, message: `Unsupported file format (.${fileExt}). Allowed formats: JPG, JPEG, PNG, WEBP` };
    }

    // MIME type check
    if (file.mimetype && !SUPPORTED_MIME_TYPES.includes(file.mimetype.toLowerCase())) {
        return { valid: false, message: `Invalid file MIME type (${file.mimetype}). Allowed types: image/jpeg, image/png, image/webp` };
    }

    return { valid: true };
}

async function uploadFileToCloudinary(file, folder, quality) {
    const options = {
        folder,
        resource_type: "image" // Enforce image resource type strictly
    };
    if (quality) {
        options.quality = quality;
    }
    return await cloudinary.uploader.upload(file.tempFilePath, options);
}

// ─── 1. Product / IceCream Upload ──────────────────────────────────────────────
exports.imageUpload = async (req, res, next) => {
    try {
        if (!req.user || !req.user.id) {
            return res.status(401).json({ success: false, message: "User not authenticated" });
        }

        const userId = req.user.id;
        const { iceName, tags, description, price } = req.body;

        if (!req.files || !req.files.imageFile) {
            return res.status(400).json({ success: false, message: "Product image file is required" });
        }

        const imageFile = req.files.imageFile;
        const fileCheck = isFileValid(imageFile);
        if (!fileCheck.valid) {
            return res.status(400).json({ success: false, message: fileCheck.message });
        }

        // Upload to Cloudinary strictly as image
        const response = await uploadFileToCloudinary(imageFile, "IceName");

        // Save to DB with authenticated user ID
        const fileData = await File.create({
            iceName,
            tags,
            description,
            price: String(price),
            iceUrl: response.secure_url,
            userId
        });

        return res.status(201).json({
            success: true,
            message: "Product uploaded successfully",
            file: fileData
        });
    } catch (error) {
        next(error);
    }
};

// ─── 2. Shop Upload with Geocoding ─────────────────────────────────────────────
exports.shopFileUpload = async (req, res, next) => {
    try {
        if (!req.user || !req.user.id) {
            return res.status(401).json({ success: false, message: "User not authenticated" });
        }

        const userId = req.user.id;
        const { shopName, location, rating } = req.body;

        if (!req.files || !req.files.shopImage) {
            return res.status(400).json({ success: false, message: "Shop image file is required" });
        }

        const shopImage = req.files.shopImage;
        const fileCheck = isFileValid(shopImage);
        if (!fileCheck.valid) {
            return res.status(400).json({ success: false, message: fileCheck.message });
        }

        // Geocode location using Nominatim API
        const coords = await geocodeLocation(location);
        if (!coords) {
            return res.status(400).json({
                success: false,
                message: "Location could not be found. Please enter a more specific location."
            });
        }

        // Upload image to Cloudinary strictly as image
        const response = await uploadFileToCloudinary(shopImage, "ShopImage");

        // Save to DB with authenticated userId & geocoded coordinates
        const fileData = await shopFile.create({
            shopName,
            location,
            rating: String(rating),
            shopImageUrl: response.secure_url,
            latitude: coords.latitude,
            longitude: coords.longitude,
            userId
        });

        return res.status(201).json({
            success: true,
            message: "Shop uploaded successfully",
            file: fileData
        });
    } catch (error) {
        next(error);
    }
};