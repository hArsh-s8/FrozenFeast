import React, { useState, useEffect } from 'react';
import UserCard from '../Components/UserCard';
import './Products.css';
import AddProduct from '../Components/AddProducts';
import { motion, AnimatePresence } from 'framer-motion';
import { API_VERSION_URL } from '../config';

import { useAuth } from '../context/AuthContext';

const Products = ({ cartItems, setCartItems }) => {
    const { user } = useAuth();
    const [productList, setProductList] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [showAlert, setShowAlert] = useState(false);
    const [favorites, setFavorites] = useState([]);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchProducts = async () => {
            try {
                setLoading(true);
                setError(null);

                const response = await fetch(`${API_VERSION_URL}/icecreams`);

                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }

                const responseData = await response.json();

                if (responseData.success) {
                    setProductList(responseData.data || []);
                } else {
                    throw new Error(responseData.message || 'Failed to fetch products');
                }
            } catch (err) {
                setError(err.message);
                console.error('Error fetching products:', err);
                setProductList([]);
            } finally {
                setLoading(false);
            }
        };

        fetchProducts();

        const fetchUserFavs = async () => {
            if (user) {
                try {
                    const res = await fetch(`${API_VERSION_URL}/user/profile`, {
                        credentials: 'include'
                    });
                    const data = await res.json();
                    if (data.success && data.user) {
                        setFavorites(data.user.favorites || []);
                    }
                } catch (e) { }
            }
        };
        fetchUserFavs();
    }, [user]);

    const handleAddToList = (product) => {
        const existingProductIndex = cartItems.findIndex(item => item._id === product._id);

        if (existingProductIndex > -1) {
            const updatedCart = cartItems.map((item, index) =>
                index === existingProductIndex
                    ? { ...item, quantity: (item.quantity || 1) + 1 }
                    : item
            );
            setCartItems(updatedCart);
        } else {
            setCartItems([...cartItems, { ...product, quantity: 1 }]);
        }

        setShowAlert(true);
    };

    const toggleFavorite = (product) => {
        let newFavs;
        if (favorites.some(f => f._id === product._id)) {
            newFavs = favorites.filter(f => f._id !== product._id);
        } else {
            newFavs = [...favorites, product];
        }
        setFavorites(newFavs);
        if (user) {
            fetch(`${API_VERSION_URL}/user/favorites`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ favorites: newFavs })
            }).catch(console.error);
        }
    };

    useEffect(() => {
        if (showAlert) {
            const timer = setTimeout(() => {
                setShowAlert(false);
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [showAlert]);

    // Filter products based on search term
    const filteredProducts = productList.filter(p => 
        (p.iceName && p.iceName.toLowerCase().includes(searchTerm.toLowerCase())) || 
        (p.name && p.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (p.tags && p.tags.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    if (loading) {
        return (
            <div className="products-page">
                <div className="loading-container">
                    <div className="spinner"></div>
                    <p>Curating our premium collection...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="products-page">
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
        <div className="products-page">
            <motion.div 
                className="products-hero"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
            >
                <span className="hero-badge">Our Menu</span>
                <h1>Discover Frozen Perfection</h1>
                <p className="hero-subtitle">
                    Explore our curated selection of artisanal ice creams, crafted with premium ingredients and unparalleled passion.
                </p>
                
                <div className="products-search-container">
                    <span className="products-search-icon">🔍</span>
                    <input 
                        type="text" 
                        className="products-search-input" 
                        placeholder="Search for flavors, tags, or ingredients..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </motion.div>

            <div className="product-container">
                <motion.div 
                    className="available-products"
                    layout
                >
                    <AnimatePresence>
                        {filteredProducts.length === 0 ? (
                            <motion.div 
                                className="empty-products"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                            >
                                <span className="empty-icon">🍨</span>
                                <p>No flavors match your search. Try another craving!</p>
                            </motion.div>
                        ) : (
                            filteredProducts.map((product, index) => (
                                <motion.div
                                    key={product._id}
                                    layout
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                    transition={{ duration: 0.3, delay: index * 0.05 }}
                                >
                                    <UserCard
                                        image={product.iceUrl}
                                        name={product.iceName || product.name}
                                        price={`₹${product.price}`}
                                        description={product.description}
                                        tag={product.tags}
                                        onAddToCart={() => handleAddToList(product)}
                                        isFavorite={favorites.some(f => f._id === product._id)}
                                        onToggleFavorite={() => toggleFavorite(product)}
                                    />
                                </motion.div>
                            ))
                        )}
                    </AnimatePresence>
                </motion.div>
            </div>

            {user && (user.role === 'Admin' || user.role === 'admin') && (
                <div>
                    <button
                        className="floating-add-btn"
                        onClick={() => setShowForm(true)}
                        title="Add New Product"
                    >
                        +
                    </button>

                    <AnimatePresence>
                        {showForm && (
                            <motion.div
                                className="modal-overlay"
                                onClick={() => setShowForm(false)}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                            >
                                <div
                                    className="modal-content"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <AddProduct />
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            )}

            <AnimatePresence>
                {showAlert && (
                    <motion.div 
                        className="cart-alert"
                        initial={{ opacity: 0, y: 50, x: '-50%' }}
                        animate={{ opacity: 1, y: 0, x: '-50%' }}
                        exit={{ opacity: 0, y: 50, x: '-50%' }}
                    >
                        <p>Item added to your cart! 🛍️</p>
                        <button onClick={() => setShowAlert(false)} className="alert-close">
                            ✕
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Products;
