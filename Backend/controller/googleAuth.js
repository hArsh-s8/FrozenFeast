const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

require("dotenv").config();

// Helper to get configured callback URL
const getCallbackUrl = () => {
    return (
        process.env.GOOGLE_CALLBACK_URL ||
        `http://localhost:${process.env.PORT || 4000}/api/v1/auth/google/callback`
    );
};

// Helper to generate a cryptographically signed CSRF state with 10-minute expiry
const generateOAuthState = () => {
    const nonce = crypto.randomBytes(16).toString("hex");
    const timestamp = Date.now();
    const secret = process.env.JWT_SECRET || "frozenfeast_oauth_secret_fallback";
    const signature = crypto
        .createHmac("sha256", secret)
        .update(`${nonce}:${timestamp}`)
        .digest("hex");
    return `${nonce}.${timestamp}.${signature}`;
};

// Helper to verify CSRF state token and cookie
const verifyOAuthState = (state, storedState) => {
    if (!state || typeof state !== "string") return false;

    // Check dual-layer cookie match if cookie is present
    if (storedState && storedState !== state) {
        console.error("OAuth state cookie mismatch");
        return false;
    }

    const parts = state.split(".");
    if (parts.length === 3) {
        const [nonce, timestampStr, signature] = parts;
        const timestamp = parseInt(timestampStr, 10);
        const now = Date.now();
        const tenMinutes = 10 * 60 * 1000;

        // Check expiry (10 minutes) + clock drift allowance (60 seconds)
        if (isNaN(timestamp) || now - timestamp > tenMinutes || timestamp > now + 60000) {
            console.error("OAuth state expired or has invalid timestamp");
            return false;
        }

        // Verify HMAC signature
        const secret = process.env.JWT_SECRET || "frozenfeast_oauth_secret_fallback";
        const expectedSignature = crypto
            .createHmac("sha256", secret)
            .update(`${nonce}:${timestamp}`)
            .digest("hex");

        try {
            const signatureBuffer = Buffer.from(signature, "hex");
            const expectedBuffer = Buffer.from(expectedSignature, "hex");

            if (signatureBuffer.length !== expectedBuffer.length) {
                return false;
            }

            return crypto.timingSafeEqual(signatureBuffer, expectedBuffer);
        } catch (e) {
            console.error("Error verifying OAuth signature:", e);
            return false;
        }
    }

    // Fallback: If legacy random hex string without dots, match directly against stored cookie
    if (storedState && storedState === state) {
        return true;
    }

    return false;
};

// ─── 1. Initiate Google OAuth Flow ───────────────────────────────────────────
exports.googleAuthInit = (req, res) => {
    const wantsJson =
        req.query.format === "json" ||
        req.xhr ||
        (req.headers.accept && req.headers.accept.includes("application/json")) ||
        req.path.endsWith("/init") ||
        req.path.endsWith("/url");

    try {
        const clientId = process.env.GOOGLE_CLIENT_ID;
        if (!clientId || clientId.includes("your_google_client_id")) {
            console.warn("Google OAuth warning: GOOGLE_CLIENT_ID environment variable is missing or placeholder.");
        }

        // Generate cryptographically signed CSRF state
        const state = generateOAuthState();

        // Store state in HTTP-only short-lived cookie (10 minutes)
        const isProduction = process.env.NODE_ENV === "production";
        res.cookie("oauth_state", state, {
            httpOnly: true,
            secure: isProduction,
            sameSite: isProduction ? "none" : "lax",
            maxAge: 10 * 60 * 1000
        });

        const redirectUri = getCallbackUrl();
        const googleAuthUrl =
            `https://accounts.google.com/o/oauth2/v2/auth?` +
            new URLSearchParams({
                client_id: clientId || "",
                redirect_uri: redirectUri,
                response_type: "code",
                scope: "openid email profile",
                state: state,
                prompt: "select_account"
            }).toString();

        if (wantsJson) {
            return res.json({
                success: true,
                url: googleAuthUrl
            });
        }

        return res.redirect(googleAuthUrl);
    } catch (error) {
        console.error("Google Auth Init Error:", error);

        if (wantsJson) {
            return res.status(500).json({
                success: false,
                message: "Failed to initialize Google OAuth"
            });
        }

        const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
        return res.redirect(`${frontendUrl}/login?error=oauth_init_failed`);
    }
};

// ─── 2. Google OAuth Callback Handler ─────────────────────────────────────────
exports.googleAuthCallback = async (req, res) => {
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
    try {
        const { code, state, error } = req.query;
        const storedState = req.cookies.oauth_state;

        // Clear state cookie
        const isProduction = process.env.NODE_ENV === "production";
        res.clearCookie("oauth_state", {
            httpOnly: true,
            secure: isProduction,
            sameSite: isProduction ? "none" : "lax"
        });

        if (error) {
            console.error("Google OAuth error from query:", error);
            return res.redirect(`${frontendUrl}/login?error=google_oauth_denied`);
        }

        // Verify CSRF state
        if (!verifyOAuthState(state, storedState)) {
            console.error("OAuth state CSRF mismatch!");
            return res.redirect(`${frontendUrl}/login?error=csrf_state_mismatch`);
        }

        if (!code) {
            return res.redirect(`${frontendUrl}/login?error=missing_auth_code`);
        }

        // Exchange code for tokens directly with Google
        const redirectUri = getCallbackUrl();
        const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
                code: String(code),
                client_id: process.env.GOOGLE_CLIENT_ID || "",
                client_secret: process.env.GOOGLE_CLIENT_SECRET || "",
                redirect_uri: redirectUri,
                grant_type: "authorization_code"
            })
        });

        const tokenData = await tokenResponse.json();
        if (!tokenResponse.ok || !tokenData.access_token) {
            console.error("Google token exchange error:", tokenData);
            return res.redirect(`${frontendUrl}/login?error=token_exchange_failed`);
        }

        // Fetch user profile from Google API
        const userinfoResponse = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
            headers: { Authorization: `Bearer ${tokenData.access_token}` }
        });

        const googleUser = await userinfoResponse.json();
        if (!userinfoResponse.ok || !googleUser || !googleUser.email) {
            console.error("Google userinfo fetch error:", googleUser);
            return res.redirect(`${frontendUrl}/login?error=user_info_failed`);
        }

        const email = googleUser.email.trim().toLowerCase();
        const googleId = googleUser.sub;

        // Find existing user by googleId or email
        let user = await User.findOne({
            $or: [{ googleId }, { email }]
        });

        if (user) {
            // Existing user found: link googleId if missing, PRESERVE EXISTING ROLE
            if (!user.googleId) {
                user.googleId = googleId;
                await user.save();
            }
        } else {
            // New user: create as regular Customer
            user = await User.create({
                name: googleUser.name || email.split("@")[0],
                email: email,
                googleId: googleId,
                role: "Customer" // Default regular user role
            });
        }

        // Generate application JWT
        const payload = { email: user.email, id: user._id, role: user.role };
        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "1d" });

        // Store JWT in HTTP-only cookie
        res.cookie("token", token, {
            httpOnly: true,
            secure: isProduction,
            sameSite: isProduction ? "none" : "lax",
            maxAge: 24 * 60 * 60 * 1000
        });

        return res.redirect(`${frontendUrl}/?oauth=success`);
    } catch (error) {
        console.error("Google Auth Callback Error:", error.message || error);
        return res.redirect(`${frontendUrl}/login?error=server_error`);
    }
};
