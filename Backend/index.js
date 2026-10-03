const os = require("os");
const express = require("express");
const app = express();
const cookieParser = require("cookie-parser");
const fileUpload = require("express-fileupload");
const cors = require("cors");
const errorHandler = require("./middleware/errorHandler");

require("dotenv").config();

const PORT = process.env.PORT || 4000;

// ─── Middleware ───────────────────────────────────────────────────
const allowedOrigins = [
    process.env.FRONTEND_URL,
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:5173",
    "https://frozenfeast.versal.app"
].filter(Boolean);

app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (like curl, Postman, server-to-server)
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, origin || true);
        } else {
            callback(new Error("CORS policy violation: Origin not allowed"));
        }
    },
    credentials: true
}));

app.use(express.json({ limit: "10mb" }));
app.use(cookieParser());

app.use(fileUpload({
    useTempFiles: true,
    tempFileDir: os.tmpdir(),
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    abortOnLimit: true,
    responseOnLimit: "File size exceeds 5MB limit"
}));

// ─── Database & Cloudinary ───────────────────────────────────────
require("./config/database").connect();
require("./config/cloudinary").connect();

// ─── Routes ──────────────────────────────────────────────────────
const userRoutes = require("./routes/user");

// Mount at /api/v1/user  → for /profile, /favorites, /signup, /login etc.
app.use("/api/v1/user", userRoutes);

// Mount at /api/v1       → for /icecreams, /shop, /deliveries, /orders etc.
app.use("/api/v1", userRoutes);

// ─── Centralized Error Handler ──────────────────────────────────
app.use(errorHandler);

// ─── Server ──────────────────────────────────────────────────────
app.listen(PORT, () => {
    console.log(`✅ Server running at http://localhost:${PORT}`);
});

