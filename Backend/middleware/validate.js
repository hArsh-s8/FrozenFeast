const { z } = require("zod");

/**
 * Express middleware generator using Zod schema.
 * Validates req.body, req.query, and req.params if defined in schema.
 */
const validate = (schema) => (req, res, next) => {
    try {
        const result = schema.parse({
            body: req.body,
            query: req.query,
            params: req.params,
        });

        // Replace req properties with sanitized/parsed values
        if (result.body) req.body = result.body;
        if (result.query) req.query = result.query;
        if (result.params) req.params = result.params;

        next();
    } catch (err) {
        if (err instanceof z.ZodError) {
            const formattedErrors = err.issues.map(issue => {
                // Remove root path prefix (e.g., 'body.', 'params.', 'query.')
                const pathParts = issue.path.slice(1);
                const fieldName = pathParts.join(".") || issue.path.join(".") || "unknown";

                return {
                    field: fieldName,
                    message: issue.message
                };
            });

            return res.status(400).json({
                success: false,
                message: "Validation failed",
                errors: formattedErrors
            });
        }
        next(err);
    }
};

module.exports = validate;
