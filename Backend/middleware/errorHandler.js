/**
 * Centralized Express Error Handling Middleware
 * Catch operational errors, Mongoose validation errors, Mongo duplicate key errors,
 * JWT verification errors, and unknown internal errors safely.
 */
const errorHandler = (err, req, res, next) => {
    // Log complete error details internally for debugging
    console.error(" Centralized Error Handler Caught:", {
        name: err.name,
        message: err.message,
        statusCode: err.statusCode || err.status || 500,
        stack: process.env.NODE_ENV === "development" ? err.stack : undefined
    });

    let statusCode = err.statusCode || err.status || 500;
    let message = err.message || "Internal server error";
    let errors = undefined;

    // 1. Mongoose Validation Error
    if (err.name === "ValidationError") {
        statusCode = 400;
        message = "Validation failed";
        errors = Object.keys(err.errors).map(key => ({
            field: key,
            message: err.errors[key].message
        }));
    }

    // 2. Mongoose Cast Error (Invalid ObjectId format)
    else if (err.name === "CastError") {
        statusCode = 400;
        message = `Invalid format for field: ${err.path}`;
    }

    // 3. MongoDB Duplicate Key Error (E11000)
    else if (err.code === 11000 || (err.message && err.message.includes("E11000"))) {
        statusCode = 409;
        const field = err.keyValue ? Object.keys(err.keyValue)[0] : "field";
        message = `Resource with this ${field} already exists`;
    }

    // 4. JWT Authentication Errors
    else if (err.name === "JsonWebTokenError") {
        statusCode = 401;
        message = "Invalid token. Please log in again.";
    }
    else if (err.name === "TokenExpiredError") {
        statusCode = 401;
        message = "Token expired. Please log in again.";
    }

    // 5. Express file upload limit error
    else if (err.code === "LIMIT_FILE_SIZE" || err.message?.includes("maxFileSize")) {
        statusCode = 400;
        message = "File size exceeds limit (5MB max)";
    }

    // Sanitize 500 internal server errors so internal details/stack traces are never exposed
    if (statusCode === 500 && process.env.NODE_ENV === "production") {
        message = "An unexpected error occurred on the server";
    }

    const response = {
        success: false,
        message
    };

    if (errors) {
        response.errors = errors;
    }

    return res.status(statusCode).json(response);
};

module.exports = errorHandler;
