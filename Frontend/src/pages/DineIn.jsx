import React, { useEffect, useState } from "react";
import ShopCard from "../Components/ShopCard";
import ShopLocationMap from "../Components/ShopLocationMap";
import './DineIn.css';
import { motion, AnimatePresence } from 'framer-motion';
import { API_VERSION_URL } from '../config';
import { getShopCoordinates } from '../data/shopCoordinates';

const DineIn = () => {
    const [dineinList, setDineinList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [location, setLocation] = useState('');
    const [selectedShop, setSelectedShop] = useState(null);

    useEffect(() => {
        const fetchDinein = async () => {
            try {
                setLoading(true);
                setError(null);
                const response = await fetch(`${API_VERSION_URL}/shop`);

                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }

                const responseData = await response.json();

                if (responseData.success) {
                    setDineinList(responseData.data || []);
                } else {
                    throw new Error(responseData.message || 'Failed to fetch shops');
                }

            } catch (error) {
                console.error("Error fetching Dine in:", error);
                setError(error.message);
            } finally {
                setLoading(false);
            }
        };

        fetchDinein();
    }, []);

    /**
     * Enriches a shop object with coordinates from the frontend lookup,
     * then sets it as the selected shop to show on the map.
     */
    const handleSelectShop = (shop) => {
        const coords = getShopCoordinates(shop.shopName);
        const enrichedShop = { ...shop, ...coords };
        console.log('Selected shop:', enrichedShop.shopName, `(${enrichedShop.latitude}, ${enrichedShop.longitude})`);
        setSelectedShop(enrichedShop);
    };

    const handleSearch = (e) => {
        e.preventDefault();
        console.log('Searching for shops near:', location);
    };

    const filteredDineinList = dineinList.filter(shop =>
        (shop.location && shop.location.toLowerCase().includes(location.toLowerCase())) ||
        (shop.shopName && shop.shopName.toLowerCase().includes(location.toLowerCase()))
    );

    if (loading) {
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
                        onClick={() => window.location.reload()}
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
                    Visit our luxurious parlors to enjoy freshly scooped artisanal ice creams in a premium, welcoming atmosphere.
                </p>
                
                <form className="location-search" onSubmit={handleSearch}>
                    <div className="search-wrapper">
                        <input
                            type="text"
                            placeholder="Enter your city or area..."
                            value={location}
                            onChange={(e) => setLocation(e.target.value)}
                            className="location-input"
                        />
                        {/* <button type="submit" className="search-button-new">
                            🔍
                        </button> */}
                    </div>
                </form>
            </motion.div>

            {/* ── Main Content: Cards + Map ─────────────────────────────── */}
            <div className="dinein-content">
                {/* ── Shop Cards ──────────────────────────────────────── */}
                <div className="shops-container">
                    <motion.div 
                        className="shops-grid"
                        layout
                    >
                        <AnimatePresence>
                            {filteredDineinList.length === 0 ? (
                                <motion.div 
                                    className="empty-shops"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                >
                                    <span className="empty-icon">📍</span>
                                    <p>We couldn't find any parlors matching your search. Try another location.</p>
                                </motion.div>
                            ) : (
                                filteredDineinList.map((shop, index) => (
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
                    <ShopLocationMap shop={selectedShop} />
                </div>
            </div>
        </div>
    );
};

export default DineIn;