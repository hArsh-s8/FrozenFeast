/**
 * shopCoordinates.js
 *
 * Frontend-side coordinate lookup for FrozenFeast shops.
 * Keys must match the `shopName` field returned by the /api/v1/shop endpoint.
 *
 * To add a new shop:
 *   1. Get its lat/lng from Google Maps (right-click → "What's here?").
 *   2. Add an entry below using the exact shopName from the database.
 */

const shopCoordinates = {
  // ── Pune ──────────────────────────────────────────────────────────────────
  "FrozenFeast Kothrud": {
    latitude: 18.5074,
    longitude: 73.8077,
  },
  "FrozenFeast Hinjewadi": {
    latitude: 18.5912,
    longitude: 73.7389,
  },
  "FrozenFeast Baner": {
    latitude: 18.5590,
    longitude: 73.7868,
  },
  "FrozenFeast Viman Nagar": {
    latitude: 18.5679,
    longitude: 73.9143,
  },
  "FrozenFeast Wakad": {
    latitude: 18.5986,
    longitude: 73.7611,
  },
  "FrozenFeast Hadapsar": {
    latitude: 18.5018,
    longitude: 73.9260,
  },
  "FrozenFeast Aundh": {
    latitude: 18.5587,
    longitude: 73.8078,
  },
  "FrozenFeast Shivajinagar": {
    latitude: 18.5308,
    longitude: 73.8474,
  },
  "FrozenFeast Deccan": {
    latitude: 18.5164,
    longitude: 73.8417,
  },
  "FrozenFeast Koregaon Park": {
    latitude: 18.5362,
    longitude: 73.8938,
  },
  // ── Mumbai ────────────────────────────────────────────────────────────────
  "FrozenFeast Bandra": {
    latitude: 19.0596,
    longitude: 72.8295,
  },
  "FrozenFeast Andheri": {
    latitude: 19.1136,
    longitude: 72.8697,
  },
  "FrozenFeast Powai": {
    latitude: 19.1176,
    longitude: 72.9060,
  },
  // ── Bangalore ─────────────────────────────────────────────────────────────
  "FrozenFeast Indiranagar": {
    latitude: 12.9784,
    longitude: 77.6408,
  },
  "FrozenFeast Koramangala": {
    latitude: 12.9352,
    longitude: 77.6245,
  },
};

/**
 * Returns coordinates for a given shop name, or a default fallback (Pune city center).
 * @param {string} shopName
 * @returns {{ latitude: number, longitude: number, isFallback: boolean }}
 */
export function getShopCoordinates(shopName) {
  if (shopName && shopCoordinates[shopName]) {
    return { ...shopCoordinates[shopName], isFallback: false };
  }
  // Default fallback: Pune city center
  return { latitude: 18.5204, longitude: 73.8567, isFallback: true };
}

export default shopCoordinates;
