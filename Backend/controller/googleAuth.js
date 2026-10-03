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

// ─── 1. Initiate Google OAuth Flow ───────────────────────────────────────────
exports.googleAuthInit = (req, res) => {
    try {
        const clientId = process.env.GOOGLE_CLIENT_ID;
        if (!clientId || clientId.includes("your_google_client_id")) {
            console.warn("Google OAuth warning: GOOGLE_CLIENT_ID environment variable is missing or placeholder.");
        }

        // Generate CSRF state
        const state = crypto.randomBytes(16).toString("hex");

        // Store state in HTTP-only short-lived cookie (10 minutes)
        res.cookie("oauth_state", state, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
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

        return res.redirect(googleAuthUrl);
    } catch (error) {
        console.error("Google Auth Init Error:", error);
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
        res.clearCookie("oauth_state", {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax"
        });

        if (error) {
            console.error("Google OAuth error from query:", error);
            return res.redirect(`${frontendUrl}/login?error=google_oauth_denied`);
        }

        // Verify CSRF state
        if (!state || !storedState || state !== storedState) {
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
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 24 * 60 * 60 * 1000
        });

        return res.redirect(`${frontendUrl}/?oauth=success`);
    } catch (error) {
        console.error("Google Auth Callback Error:", error.message || error);
        return res.redirect(`${frontendUrl}/login?error=server_error`);
    }
};
