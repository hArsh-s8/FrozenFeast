import React, { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './ShopLocationMap.css';

import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

// Custom purple marker for shop locations
const purpleIcon = new L.Icon({
  iconUrl:
    'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-violet.png',
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

// Custom red marker for searched customer location
const customerIcon = new L.Icon({
  iconUrl:
    'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

function MapFlyTo({ lat, lng }) {
  const map = useMap();

  useEffect(() => {
    if (lat != null && lng != null && !isNaN(lat) && !isNaN(lng)) {
      map.flyTo([lat, lng], 13, { duration: 1.2 });
    }
  }, [lat, lng, map]);

  return null;
}

/**
 * ShopLocationMap
 *
 * Props:
 *   shop — selected shop object { shopName, location, latitude, longitude, distanceKm, hasCoordinates }
 *   customerLocation — optional geocoded customer search location { latitude, longitude, displayName }
 */
const ShopLocationMap = ({ shop, customerLocation }) => {
  const targetLat = customerLocation?.latitude ?? shop?.latitude ?? null;
  const targetLng = customerLocation?.longitude ?? shop?.longitude ?? null;

  const initialCenter = useRef(
    targetLat != null && targetLng != null ? [targetLat, targetLng] : null
  );

  if (targetLat == null || targetLng == null) {
    return (
      <div className="shop-map-panel">
        <div className="shop-map-placeholder">
          <span className="shop-map-placeholder-icon">🗺️</span>
          <p>
            {shop && shop.hasCoordinates === false
              ? "Location coordinates are unavailable for this parlor."
              : "Search a city/address or select a parlor to see its location on the map."}
          </p>
        </div>
      </div>
    );
  }

  const directionsUrl = shop?.latitude != null && shop?.longitude != null
    ? `https://www.google.com/maps/dir/?api=1&destination=${shop.latitude},${shop.longitude}`
    : null;

  return (
    <div className="shop-map-panel">
      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="shop-map-header">
        <div className="shop-map-header-info">
          <span className="shop-map-label">📍 {customerLocation ? "Nearby Parlors Map" : "Shop Location"}</span>
          <h3 className="shop-map-title">{shop?.shopName || customerLocation?.displayName || "Parlor Locations"}</h3>
          <p className="shop-map-address">
            {shop?.location || customerLocation?.displayName}
            {shop?.distanceKm != null && ` • ${shop.distanceKm} km away`}
          </p>
        </div>
        {directionsUrl && (
          <a
            href={directionsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="shop-map-directions-btn"
            aria-label={`Get directions to ${shop?.shopName || 'shop'}`}
          >
            🧭 Get Directions
          </a>
        )}
      </div>

      {/* ── Leaflet Map Container ───────────────────────────────── */}
      <div className="shop-map-leaflet-wrapper">
        <MapContainer
          center={initialCenter.current || [targetLat, targetLng]}
          zoom={13}
          scrollWheelZoom={true}
          style={{ height: '100%', width: '100%' }}
          key="frozen-feast-shop-map"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <MapFlyTo lat={targetLat} lng={targetLng} />

          {/* Searched Customer Location Marker */}
          {customerLocation?.latitude != null && customerLocation?.longitude != null && (
            <Marker position={[customerLocation.latitude, customerLocation.longitude]} icon={customerIcon}>
              <Popup>
                <p className="map-popup-name">📍 Your Searched Location</p>
                <p className="map-popup-address">{customerLocation.displayName}</p>
              </Popup>
            </Marker>
          )}

          {/* Selected Shop Marker */}
          {shop?.latitude != null && shop?.longitude != null && shop?.hasCoordinates !== false && (
            <Marker position={[shop.latitude, shop.longitude]} icon={purpleIcon}>
              <Popup>
                <p className="map-popup-name">{shop.shopName}</p>
                <p className="map-popup-address">{shop.location}</p>
                {shop.distanceKm != null && <p className="map-popup-distance">📏 {shop.distanceKm} km away</p>}
              </Popup>
            </Marker>
          )}
        </MapContainer>
      </div>
    </div>
  );
};

export default ShopLocationMap;
