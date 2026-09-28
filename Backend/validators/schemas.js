const { z } = require("zod");
const mongoose = require("mongoose");

// Helper for valid MongoDB ObjectId
const objectIdSchema = z.string({ required_error: "ID is required" }).refine(
    (val) => mongoose.Types.ObjectId.isValid(val),
    { message: "Invalid MongoDB ObjectId format" }
);

// Optional ObjectId (can be undefined, null, empty string, or valid ObjectId string)
const optionalObjectIdSchema = z.union([
    objectIdSchema,
    z.string().length(0),
    z.null(),
    z.undefined()
]).transform(val => (val && mongoose.Types.ObjectId.isValid(val) ? val : null));

// ─── 1. Auth Schemas ────────────────────────────────────────────────────────
const signupSchema = z.object({
    body: z.object({
        name: z.string({ required_error: "Name is required" })
            .trim()
            .min(1, "Name cannot be empty"),
        email: z.string({ required_error: "Email is required" })
            .trim()
            .toLowerCase()
            .email("Invalid email format"),
        password: z.string({ required_error: "Password is required" })
            .min(6, "Password must be at least 6 characters long"),
    }).strip()
});

const loginSchema = z.object({
    body: z.object({
        email: z.string({ required_error: "Email is required" })
            .trim()
            .toLowerCase()
            .email("Invalid email format"),
        password: z.string({ required_error: "Password is required" })
            .min(1, "Password cannot be empty"),
    }).strip()
});

const updateProfileSchema = z.object({
    body: z.object({
        name: z.string({ required_error: "Name is required" })
            .trim()
            .min(1, "Name cannot be empty"),
        email: z.string({ required_error: "Email is required" })
            .trim()
            .toLowerCase()
            .email("Invalid email format"),
    }).strip()
});

const updateFavoritesSchema = z.object({
    body: z.object({
        favorites: z.array(z.any(), { required_error: "favorites array is required" })
    }).strip()
});

// ─── 2. Order & Payment Schemas ─────────────────────────────────────────────
const orderItemSchema = z.object({
    _id: objectIdSchema,
    quantity: z.number({ required_error: "Quantity is required" })
        .int("Quantity must be an integer")
        .min(1, "Quantity must be at least 1")
        .max(100, "Quantity cannot exceed 100")
});

const createOrderSchema = z.object({
    body: z.object({
        items: z.array(orderItemSchema, { required_error: "Order items are required" })
            .min(1, "Order items cannot be empty"),
        addressId: optionalObjectIdSchema.optional()
    }).strip()
});

const verifyPaymentSchema = z.object({
    body: z.object({
        razorpay_order_id: z.string().optional(),
        razorpay_payment_id: z.string().optional(),
        razorpay_signature: z.string().optional(),
        isDummy: z.boolean().optional(),
        items: z.array(z.any()).optional(),
        addressId: optionalObjectIdSchema.optional()
    }).strip()
});

const getOrderByIdSchema = z.object({
    params: z.object({
        orderId: z.string({ required_error: "Order ID parameter is required" })
            .trim()
            .min(1, "Order ID cannot be empty")
    })
});

// ─── 3. Delivery / Address Schemas ──────────────────────────────────────────
const createDeliverySchema = z.object({
    body: z.object({
        name: z.string({ required_error: "Name is required" })
            .trim()
            .min(1, "Name cannot be empty"),
        contact: z.string({ required_error: "Contact phone number is required" })
            .trim()
            .min(5, "Contact number must be at least 5 digits"),
        streetAdd: z.string({ required_error: "Street address is required" })
            .trim()
            .min(1, "Street address cannot be empty"),
        city: z.string({ required_error: "City is required" })
            .trim()
            .min(1, "City cannot be empty"),
        district: z.string({ required_error: "District is required" })
            .trim()
            .min(1, "District cannot be empty"),
        pin: z.string({ required_error: "PIN code is required" })
            .trim()
            .min(3, "PIN code must be at least 3 characters"),
    }).strip()
});

const deleteDeliverySchema = z.object({
    params: z.object({
        id: objectIdSchema
    })
});

// ─── 4. Product Admin Upload Schemas ────────────────────────────────────────
const imageUploadSchema = z.object({
    body: z.object({
        iceName: z.string({ required_error: "Ice cream name is required" })
            .trim()
            .min(1, "Ice cream name cannot be empty"),
        tags: z.string({ required_error: "Tags are required" })
            .trim()
            .min(1, "Tags cannot be empty"),
        description: z.string().optional().default(""),
        price: z.coerce.number({ required_error: "Price is required" })
            .min(0, "Price must be a non-negative number")
    }).strip()
});

const shopFileUploadSchema = z.object({
    body: z.object({
        shopName: z.string({ required_error: "Shop name is required" })
            .trim()
            .min(1, "Shop name cannot be empty"),
        location: z.string({ required_error: "Location is required" })
            .trim()
            .min(1, "Location cannot be empty"),
        rating: z.coerce.number({ required_error: "Rating is required" })
            .min(0, "Rating cannot be negative")
            .max(5, "Rating cannot exceed 5")
    }).strip()
});

// ─── 5. Pagination / Query Schemas ──────────────────────────────────────────
const paginationQuerySchema = z.object({
    query: z.object({
        page: z.coerce.number().int().min(1, "Page must be >= 1").optional().default(1),
        limit: z.coerce.number().int().min(1, "Limit must be >= 1").max(100, "Limit cannot exceed 100").optional().default(20)
    }).strip()
});

const shopQuerySchema = z.object({
    query: z.object({
        page: z.coerce.number().int().min(1).optional().default(1),
        limit: z.coerce.number().int().min(1).max(100).optional().default(20),
        location: z.string().trim().optional(),
        search: z.string().trim().optional(),
        radius: z.coerce.number().positive().optional()
    }).strip()
});

module.exports = {
    signupSchema,
    loginSchema,
    updateProfileSchema,
    updateFavoritesSchema,
    createOrderSchema,
    verifyPaymentSchema,
    getOrderByIdSchema,
    createDeliverySchema,
    deleteDeliverySchema,
    imageUploadSchema,
    shopFileUploadSchema,
    paginationQuerySchema,
    shopQuerySchema
};
