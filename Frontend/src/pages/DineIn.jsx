import React, { useEffect, useState } from "react";
import ShopCard from "../Components/ShopCard";
import ShopLocationMap from "../Components/ShopLocationMap";
import './DineIn.css';
import { motion, AnimatePresence } from 'framer-motion';
import { API_VERSION_URL } from '../config';

const DineIn = () => {
    const [dineinList, setDineinList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchError, setSearchError] = useState(null);
    const [locationInput, setLocationInput] = useState('');
    const [selectedShop, setSelectedShop] = useState(null);
    const [customerLocation, setCustomerLocation] = useState(null);

    const fetchAllShops = async () => {
        try {
            setLoading(true);
            setError(null);
            setSearchError(null);
            const response = await fetch(`${API_VERSION_URL}/shop`);

            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }

            const responseData = await response.json();

            if (responseData.success) {
                const shops = responseData.data || [];
                setDineinList(shops);
                setCustomerLocation(null);
                if (shops.length > 0) {
                    const firstWithCoords = shops.find(s => s.latitude != null && s.longitude != null) || shops[0];
                    setSelectedShop(firstWithCoords);
                }
            } else {
                throw new Error(responseData.message || 'Failed to fetch shops');
            }

        } catch (err) {
            console.error("Error fetching shops:", err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAllShops();
    }, []);

    const handleSelectShop = (shop) => {
        // Use latitude and longitude directly from shop object (no hardcoded fallback)
        const lat = shop.latitude != null ? Number(shop.latitude) : null;
        const lng = shop.longitude != null ? Number(shop.longitude) : null;
        const selected = { ...shop, latitude: lat, longitude: lng };
        setSelectedShop(selected);
    };

    const handleSearchSubmit = async (e) => {
        e.preventDefault();
        if (!locationInput || !locationInput.trim()) {
            fetchAllShops();
            return;
        }

        try {
            setLoading(true);
            setError(null);
            setSearchError(null);

            const query = encodeURIComponent(locationInput.trim());
            const response = await fetch(`${API_VERSION_URL}/shop?location=${query}`);
            const responseData = await response.json();

            if (!response.ok) {
                throw new Error(responseData.message || "Location could not be found. Please enter a more specific location.");
            }

            if (responseData.success) {
                const shops = responseData.data || [];
                setDineinList(shops);
                setCustomerLocation(responseData.customerLocation || null);

                if (shops.length > 0) {
                    setSelectedShop(shops[0]);
                } else {
                    setSelectedShop(null);
                }
            }
        } catch (err) {
            console.error("Customer location search error:", err);
            setSearchError(err.message || "Location could not be found. Please enter a more specific location.");
            setDineinList([]);
            setSelectedShop(null);
            setCustomerLocation(null);
        } finally {
            setLoading(false);
        }
    };

    if (loading && dineinList.length === 0 && !searchError) {
        return (
            <div className="dinein-container">
                <div className="loading-container">
                    <div className="spinner"></div>
                    <p>Locating the finest parlors near you...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="dinein-container">
                <div className="loading-container" style={{ color: '#ff5252' }}>
                    <p>⚠️ Error: {error}</p>
                    <button 
                        onClick={fetchAllShops}
                        style={{ marginTop: '20px', padding: '10px 24px', borderRadius: '50px', background: '#ff5252', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}
                    >
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="dinein-container">
            {/* ── Hero & Search ─────────────────────────────────────────── */}
            <motion.div 
                className="dinein-hero"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
            >
                <span className="hero-badge">Dine-In Experience</span>
                <h1>Find Your Nearest Store</h1>
                <p className="hero-subtitle">
                    Enter your city or area to find luxurious artisanal parlors nearest to you.
                </p>
                
                <form className="location-search" onSubmit={handleSearchSubmit}>
                    <div className="search-wrapper" style={{ display: 'flex', gap: '8px', maxWidth: '540px', margin: '0 auto' }}>
                        <input
                            type="text"
                            placeholder="Enter city, landmark or area (e.g. Pune, Bandra Mumbai)..."
                            value={locationInput}
                            onChange={(e) => setLocationInput(e.target.value)}
                            className="location-input"
                            style={{ flex: 1 }}
                        />
                        <button type="submit" className="search-button-new" style={{ padding: '0 20px', cursor: 'pointer', borderRadius: '50px' }} aria-label="Search location">
                            🔍 Search
                        </button>
                    </div>
                </form>

                {searchError && (
                    <div className="search-error-banner" style={{ marginTop: '16px', color: '#ff5252', fontWeight: 600 }}>
                        ⚠️ {searchError}
                    </div>
                )}
            </motion.div>

            {/* ── Main Content: Cards + Map ─────────────────────────────── */}
            <div className="dinein-content">
                {/* ── Shop Cards ──────────────────────────────────────── */}
                <div className="shops-container">
                    <motion.div className="shops-grid" layout>
                        <AnimatePresence>
                            {dineinList.length === 0 ? (
                                <motion.div 
                                    className="empty-shops"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                >
                                    <span className="empty-icon">📍</span>
                                    <p>{searchError || "No parlors found near this location. Try searching another area."}</p>
                                    <button 
                                        onClick={fetchAllShops}
                                        style={{ marginTop: '12px', padding: '8px 18px', borderRadius: '20px', background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)', cursor: 'pointer' }}
                                    >
                                        Show All Parlors
                                    </button>
                                </motion.div>
                            ) : (
                                dineinList.map((shop, index) => (
                                    <motion.div
                                        key={shop._id || shop.id || index}
                                        layout
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.9 }}
                                        transition={{ duration: 0.3, delay: index * 0.05 }}
                                    >
                                        <ShopCard
                                            shopName={shop.shopName}
                                            shopImageUrl={shop.shopImageUrl}
                                            location={shop.location}
                                            rating={shop.rating || 0}
                                            distanceKm={shop.distanceKm}
                                            onSelectShop={() => handleSelectShop(shop)}
                                            isSelected={
                                                selectedShop &&
                                                (selectedShop._id
                                                    ? selectedShop._id === shop._id
                                                    : selectedShop.shopName === shop.shopName)
                                            }
                                        />
                                    </motion.div>
                                ))
                            )}
                        </AnimatePresence>
                    </motion.div>
                </div>

                {/* ── Map Panel ────────────────────────────────────────── */}
                <div className="dinein-map-panel">
                    <ShopLocationMap shop={selectedShop} customerLocation={customerLocation} />
                </div>
            </div>
        </div>
    );
};

export default DineIn;