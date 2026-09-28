require("dotenv").config();

/**
 * Validates whether latitude and longitude are within standard geographic boundaries.
 * @param {number} lat - Latitude (-90 to 90)
 * @param {number} lon - Longitude (-180 to 180)
 * @returns {boolean}
 */
function isValidCoordinate(lat, lon) {
    if (typeof lat !== "number" || typeof lon !== "number" || isNaN(lat) || isNaN(lon)) {
        return false;
    }
    if (lat === 0 && lon === 0) {
        return false; // Reject 0, 0 fallback
    }
    return lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180;
}

/**
 * Geocodes an address or location name using OpenStreetMap Nominatim Search API.
 *
 * @param {string} locationName - Location or address string (e.g. "Pune, Maharashtra" or "FC Road, Pune")
 * @returns {Promise<{ latitude: number, longitude: number, displayName: string } | null>}
 */
async function geocodeLocation(locationName) {
    if (!locationName || typeof locationName !== "string" || locationName.trim() === "") {
        return null;
    }

    try {
        const query = encodeURIComponent(locationName.trim());
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${query}&limit=1`;
        const userAgent = process.env.GEOCODING_USER_AGENT || "FrozenFeast/1.0 (college-demo-app)";

        const response = await fetch(url, {
            headers: {
                "User-Agent": userAgent,
                "Accept": "application/json"
            }
        });

        if (!response.ok) {
            console.error(`Nominatim geocoding HTTP error: ${response.status}`);
            return null;
        }

        const data = await response.json();

        if (!Array.isArray(data) || data.length === 0) {
            console.warn(`No geocoding results found for: "${locationName}"`);
            return null;
        }

        const result = data[0];
        const latitude = parseFloat(result.lat);
        const longitude = parseFloat(result.lon);

        if (!isValidCoordinate(latitude, longitude)) {
            console.warn(`Invalid coordinates returned by Nominatim for "${locationName}": lat=${latitude}, lon=${longitude}`);
            return null;
        }

        return {
            latitude,
            longitude,
            displayName: result.display_name || locationName.trim()
        };
    } catch (error) {
        console.error("Geocoding service error:", error.message || error);
        return null;
    }
}

/**
 * Calculates the great-circle distance between two geographic points using the Haversine formula.
 *
 * @param {number} lat1 - Latitude of point 1
 * @param {number} lon1 - Longitude of point 1
 * @param {number} lat2 - Latitude of point 2
 * @param {number} lon2 - Longitude of point 2
 * @returns {number} Distance in kilometers
 */
function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);

    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * (Math.PI / 180)) *
        Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c * 10) / 10; // Rounded to 1 decimal place
}

module.exports = {
    isValidCoordinate,
    geocodeLocation,
    calculateHaversineDistance
};
