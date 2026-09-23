import React, { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './ShopLocationMap.css';

// Fix Leaflet's default marker icon path issue with webpack/CRA
// (leaflet ships marker icons as separate files; webpack changes their paths)
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

// Custom purple marker to match FrozenFeast branding
const purpleIcon = new L.Icon({
  iconUrl:
    'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-violet.png',
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

// ── Inner helper: flies the map to new coords whenever `shop` changes ────────
// Must be rendered inside <MapContainer> to access the map instance via useMap()
function MapFlyTo({ lat, lng }) {
  const map = useMap();

  useEffect(() => {
    if (lat != null && lng != null) {
      map.flyTo([lat, lng], 15, { duration: 1.2 });
    }
  }, [lat, lng, map]);

  return null;
}

// ── Main exported component ───────────────────────────────────────────────────
/**
 * ShopLocationMap
 *
 * Props:
 *   shop — the currently selected shop object (null means show placeholder).
 *          Expected shape: { shopName, location, latitude, longitude }
 *
 * Behaviour:
 *   - First render: creates the map centered on the shop.
 *   - Subsequent renders with a different shop: reuses the same map instance
 *     and calls flyTo() to smoothly animate to the new location.
 *   - Never mounts more than one MapContainer.
 */
const ShopLocationMap = ({ shop }) => {
  // We keep a stable initial center so MapContainer never re-mounts.
  // All dynamic recentering is handled by <MapFlyTo />.
  const initialCenter = useRef(
    shop
      ? [shop.latitude, shop.longitude]
      : [18.5204, 73.8567] // Pune fallback
  );

  if (!shop) {
    return (
      <div className="shop-map-panel">
        <div className="shop-map-placeholder">
          <span className="shop-map-placeholder-icon">🗺️</span>
          <p>Select a shop card to see its location on the map.</p>
        </div>
      </div>
    );
  }

  const { shopName, location, latitude, longitude, isFallback } = shop;

  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;

  return (
    <div className="shop-map-panel">
      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="shop-map-header">
        <div className="shop-map-header-info">
          <span className="shop-map-label">📍 Shop Location</span>
          <h3 className="shop-map-title">{shopName}</h3>
          <p className="shop-map-address">{location}</p>
        </div>
        <a
          href={directionsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="shop-map-directions-btn"
          aria-label={`Get directions to ${shopName}`}
          id={`directions-btn-${shopName?.replace(/\s+/g, '-').toLowerCase()}`}
        >
          🧭 Get Directions
        </a>
      </div>

      {/* ── Map ─────────────────────────────────────────────────── */}
      <div className="shop-map-leaflet-wrapper">
        <MapContainer
          center={initialCenter.current}
          zoom={15}
          scrollWheelZoom={true}
          style={{ height: '100%', width: '100%' }}
          // Prevent re-mount when shop changes — flyTo handles recentering
          key="frozen-feast-shop-map"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* Smoothly fly to the new shop location */}
          <MapFlyTo lat={latitude} lng={longitude} />

          {/* Shop marker */}
          <Marker position={[latitude, longitude]} icon={purpleIcon}>
            <Popup>
              <p className="map-popup-name">{shopName}</p>
              <p className="map-popup-address">{location}</p>
            </Popup>
          </Marker>
        </MapContainer>
      </div>

      {/* Fallback notice when coordinates are approximated */}
      {isFallback && (
        <div className="shop-map-fallback-banner">
          ⚠️ Exact coordinates unavailable — showing approximate location.
        </div>
      )}
    </div>
  );
};

export default ShopLocationMap;
