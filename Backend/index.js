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
const rawAllowedOrigins = [
    process.env.FRONTEND_URL,
    "https://frozenfeast.vercel.app",
    "https://frozenfeast.onrender.com",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:5173",
    "http://127.0.0.1:5173"
];

const allowedOrigins = rawAllowedOrigins
    .filter(Boolean)
    .map(origin => origin.trim().replace(/\/+$/, ""));

app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps, curl, Postman, server-to-server)
        if (!origin) {
            return callback(null, true);
        }

        const normalizedOrigin = origin.trim().replace(/\/+$/, "");

        const isAllowed =
            allowedOrigins.includes(normalizedOrigin) ||
            normalizedOrigin.endsWith(".vercel.app");

        if (isAllowed) {
            return callback(null, true);
        }

        console.warn(`[CORS Blocked] Origin not allowed: ${origin}`);
        return callback(new Error("CORS policy violation: Origin not allowed"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept"]
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

