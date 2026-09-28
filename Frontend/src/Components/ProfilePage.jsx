import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, NavLink } from 'react-router-dom';
import iceCreamIcon from '../assets/logo.png';
import { motion, AnimatePresence } from 'framer-motion';
import './ProfilePage.css';

import { API_VERSION_URL } from "../config";

import { useAuth } from '../context/AuthContext';

const BASE_URL = API_VERSION_URL;

const ProfilePage = () => {
    const { logout } = useAuth();
    const [user, setUser] = useState(null);
    const [addresses, setAddresses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [editing, setEditing] = useState(false);
    const [editForm, setEditForm] = useState({ name: '', email: '' });
    const [favorites, setFavorites] = useState([]);
    const [recentOrders, setRecentOrders] = useState([]);
    const [activeTab, setActiveTab] = useState('info'); // 'info' | 'favorites' | 'orders' | 'addresses'
    const [savingProfile, setSavingProfile] = useState(false);

    const navigate = useNavigate();

    const fetchAll = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            // Fetch profile (includes favorites + recentOrders)
            const [profileRes, addressRes, ordersRes] = await Promise.allSettled([
                fetch(`${BASE_URL}/user/profile`, {
                    credentials: 'include'
                }),
                fetch(`${BASE_URL}/deliveries`, {
                    credentials: 'include'
                }),
                fetch(`${BASE_URL}/orders`, {
                    credentials: 'include'
                })
            ]);

            // Handle profile
            if (profileRes.status === 'fulfilled') {
                const userData = await profileRes.value.json();
                if (!profileRes.value.ok) {
                    if (profileRes.value.status === 401) {
                        navigate('/login');
                        return;
                    }
                    throw new Error(userData.message || 'Failed to fetch profile');
                }
                if (userData.success) {
                    setUser(userData.user);
                    setEditForm({ name: userData.user.name || '', email: userData.user.email || '' });
                    setFavorites(userData.user.favorites || []);
                }
            }

            // Handle addresses
            if (addressRes.status === 'fulfilled' && addressRes.value.ok) {
                const addrData = await addressRes.value.json();
                if (addrData.success) setAddresses(addrData.deliveries || []);
            }

            // Handle orders (dedicated endpoint for freshest data)
            if (ordersRes.status === 'fulfilled' && ordersRes.value.ok) {
                const ordersData = await ordersRes.value.json();
                if (ordersData.success) setRecentOrders(ordersData.recentOrders || []);
            }

        } catch (err) {
            console.error('Profile fetch error:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [navigate]);

    useEffect(() => {
        fetchAll();
    }, [fetchAll]);

    const handleSave = async () => {
        try {
            setSavingProfile(true);
            const response = await fetch(`${BASE_URL}/user/profile`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify(editForm),
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.message || `Update failed`);

            if (data.success) {
                setUser(prev => ({ ...prev, ...data.user }));
                setEditing(false);
            }
        } catch (err) {
            alert(`Error: ${err.message}`);
        } finally {
            setSavingProfile(false);
        }
    };

    const removeFavorite = async (index) => {
        const newFavs = favorites.filter((_, i) => i !== index);
        setFavorites(newFavs);
        try {
            await fetch(`${BASE_URL}/user/favorites`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({ favorites: newFavs })
            });
        } catch (e) {
            console.error('Error removing favorite', e);
        }
    };

    const deleteAddress = async (id) => {
        if (!window.confirm("Remove this address?")) return;
        try {
            const res = await fetch(`${BASE_URL}/delivery/${id}`, {
                method: 'DELETE',
                credentials: 'include'
            });
            const data = await res.json();
            if (data.success) {
                setAddresses(prev => prev.filter(a => a._id !== id));
            } else {
                alert(data.message || "Failed to delete address");
            }
        } catch (e) {
            console.error('Error deleting address', e);
        }
    };

    const handleLogout = async () => {
        await logout();
        navigate('/');
    };

    const tabConfig = [
        { id: 'info', label: '👤 Profile', count: null },
        { id: 'favorites', label: '❤️ Favorites', count: favorites.length },
        { id: 'orders', label: '📦 Orders', count: recentOrders.length },
        { id: 'addresses', label: '📍 Addresses', count: addresses.length },
    ];

    if (loading) {
        return (
            <div className="profile-loading">
                <img src={iceCreamIcon} alt="Loading..." className="logo" />
                <p>Loading your profile...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="profile-error">
                <h2>⚠️ {error}</h2>
                <div className="error-actions">
                    <button onClick={fetchAll}>Retry</button>
                    <button onClick={() => navigate('/login')}>Go to Login</button>
                </div>
            </div>
        );
    }

    if (!user) {
        return (
            <div className="profile-error">
                <h2>No profile data found</h2>
                <button onClick={() => navigate('/login')}>Go to Login</button>
            </div>
        );
    }

    return (
        <div className="profile-container">
            {/* Header */}
            <div className="profile-header">
                <div className="profile-avatar">
                    {user.name ? user.name[0].toUpperCase() : '?'}
                </div>
                <div className="profile-header-info">
                    <h1>{user.name}</h1>
                    <p className="profile-email">{user.email}</p>
                    <span className={`role-badge role-${(user.role || 'customer').toLowerCase()}`}>
                        {user.role || 'Customer'}
                    </span>
                </div>
                <button onClick={handleLogout} className="logout-btn">Logout</button>
            </div>

            {/* Tabs */}
            <div className="profile-tabs">
                {tabConfig.map(tab => (
                    <button
                        key={tab.id}
                        className={`profile-tab ${activeTab === tab.id ? 'active' : ''}`}
                        onClick={() => setActiveTab(tab.id)}
                    >
                        {tab.label}
                        {tab.count !== null && tab.count > 0 && (
                            <span className="tab-badge">{tab.count}</span>
                        )}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            <AnimatePresence mode="wait">
                <motion.div
                    key={activeTab}
                    className="profile-tab-content"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -12 }}
                    transition={{ duration: 0.2 }}
                >

                    {/* ── Profile Info ─────────────────────────────── */}
                    {activeTab === 'info' && (
                        <div className="profile-section">
                            <div className="section-header">
                                <h2>Personal Information</h2>
                                {!editing && (
                                    <button onClick={() => setEditing(true)} className="edit-btn">
                                        Edit
                                    </button>
                                )}
                            </div>

                            {editing ? (
                                <div className="edit-form">
                                    <label>Full Name</label>
                                    <input
                                        type="text"
                                        value={editForm.name}
                                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                        placeholder="Full Name"
                                    />
                                    <label>Email</label>
                                    <input
                                        type="email"
                                        value={editForm.email}
                                        onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                                        placeholder="Email"
                                    />
                                    <div className="edit-buttons">
                                        <button onClick={handleSave} disabled={savingProfile} className="save-btn">
                                            {savingProfile ? "Saving..." : "Save Changes"}
                                        </button>
                                        <button onClick={() => setEditing(false)} className="cancel-btn">
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="info-grid">
                                    <div className="info-item">
                                        <span className="info-label">Name</span>
                                        <span className="info-value">{user.name || 'N/A'}</span>
                                    </div>
                                    <div className="info-item">
                                        <span className="info-label">Email</span>
                                        <span className="info-value">{user.email || 'N/A'}</span>
                                    </div>
                                    {user.phone && (
                                        <div className="info-item">
                                            <span className="info-label">Phone</span>
                                            <span className="info-value">{user.phone}</span>
                                        </div>
                                    )}
                                    <div className="info-item">
                                        <span className="info-label">Role</span>
                                        <span className="info-value">{user.role || 'Customer'}</span>
                                    </div>
                                    <div className="info-item">
                                        <span className="info-label">Member since</span>
                                        <span className="info-value">
                                            {user.createdAt
                                                ? new Date(user.createdAt).toLocaleDateString('en-IN', {
                                                    month: 'long', year: 'numeric'
                                                })
                                                : 'N/A'}
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── Favorites ────────────────────────────────── */}
                    {activeTab === 'favorites' && (
                        <div className="profile-section">
                            <div className="section-header">
                                <h2>My Favorites</h2>
                                <NavLink to="/products" className="browse-link">Browse Products →</NavLink>
                            </div>

                            {favorites.length > 0 ? (
                                <div className="favorites-grid">
                                    {favorites.map((fav, index) => (
                                        <motion.div
                                            key={fav._id || index}
                                            className="favorite-card"
                                            initial={{ opacity: 0, scale: 0.95 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            transition={{ delay: index * 0.05 }}
                                        >
                                            {fav.iceUrl && (
                                                <img
                                                    src={fav.iceUrl}
                                                    alt={fav.iceName || fav.name}
                                                    className="fav-img"
                                                    onError={(e) => { e.target.style.display = 'none'; }}
                                                />
                                            )}
                                            <div className="fav-body">
                                                <p className="fav-name">{fav.iceName || fav.name || 'Unknown'}</p>
                                                {fav.price > 0 && (
                                                    <p className="fav-price">₹{fav.price}</p>
                                                )}
                                                {fav.tags && (
                                                    <span className="fav-tag">{fav.tags}</span>
                                                )}
                                            </div>
                                            <button
                                                className="remove-fav-btn"
                                                onClick={() => removeFavorite(index)}
                                                title="Remove from favorites"
                                            >
                                                ✕
                                            </button>
                                        </motion.div>
                                    ))}
                                </div>
                            ) : (
                                <div className="empty-state">
                                    <span className="empty-icon">❤️</span>
                                    <p>No favorites yet.</p>
                                    <NavLink to="/products" className="empty-action-btn">
                                        Browse Products
                                    </NavLink>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── Orders ───────────────────────────────────── */}
                    {activeTab === 'orders' && (
                        <div className="profile-section">
                            <div className="section-header">
                                <h2>Recent Orders</h2>
                            </div>

                            {recentOrders.length > 0 ? (
                                <div className="orders-list">
                                    {recentOrders.map((order, idx) => (
                                        <motion.div
                                            key={order.orderId || idx}
                                            className="order-card"
                                            initial={{ opacity: 0, y: 16 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: idx * 0.05 }}
                                        >
                                            <div className="order-card-header">
                                                <div>
                                                    <p className="order-id">
                                                        Order #{(order.orderId || '').slice(-8).toUpperCase() || idx + 1}
                                                    </p>
                                                    <p className="order-date">
                                                        {order.date
                                                            ? new Date(order.date).toLocaleDateString('en-IN', {
                                                                day: 'numeric', month: 'short', year: 'numeric',
                                                                hour: '2-digit', minute: '2-digit'
                                                            })
                                                            : 'N/A'}
                                                    </p>
                                                </div>
                                                <div className="order-card-right">
                                                    <span className={`order-status status-${(order.status || 'placed').toLowerCase()}`}>
                                                        {order.status || 'Placed'}
                                                    </span>
                                                    <span className="order-total">₹{Number(order.total).toFixed(2)}</span>
                                                </div>
                                            </div>
                                            <div className="order-items-list">
                                                {(order.items || []).map((item, i) => (
                                                    <div key={i} className="order-item-row">
                                                        <span className="order-item-name">
                                                            {item.iceName || item.name || 'Item'}
                                                        </span>
                                                        <span className="order-item-qty">×{item.quantity}</span>
                                                        <span className="order-item-price">
                                                            ₹{(item.price * item.quantity).toFixed(2)}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            ) : (
                                <div className="empty-state">
                                    <span className="empty-icon">📦</span>
                                    <p>No orders placed yet.</p>
                                    <NavLink to="/products" className="empty-action-btn">
                                        Shop Now
                                    </NavLink>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── Addresses ────────────────────────────────── */}
                    {activeTab === 'addresses' && (
                        <div className="profile-section">
                            <div className="section-header">
                                <h2>Saved Addresses</h2>
                                <NavLink to="/delivery" className="browse-link">+ Add Address</NavLink>
                            </div>

                            {addresses.length > 0 ? (
                                <div className="addresses-list">
                                    {addresses.map((address, index) => (
                                        <motion.div
                                            key={address._id || index}
                                            className="address-item"
                                            initial={{ opacity: 0, x: -16 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: index * 0.07 }}
                                        >
                                            <div className="address-icon">📍</div>
                                            <div className="address-body">
                                                <p className="address-title">{address.name}</p>
                                                <p className="address-line">
                                                    {address.streetAdd}, {address.city}, {address.district} — {address.pin}
                                                </p>
                                                {address.contact && (
                                                    <p className="address-contact">📞 {address.contact}</p>
                                                )}
                                            </div>
                                            <button
                                                className="delete-address-btn"
                                                onClick={() => deleteAddress(address._id)}
                                                title="Delete address"
                                            >
                                                🗑️
                                            </button>
                                        </motion.div>
                                    ))}
                                </div>
                            ) : (
                                <div className="empty-state">
                                    <span className="empty-icon">📍</span>
                                    <p>No saved addresses.</p>
                                    <NavLink to="/delivery" className="empty-action-btn">
                                        Add Address
                                    </NavLink>
                                </div>
                            )}
                        </div>
                    )}

                </motion.div>
            </AnimatePresence>
        </div>
    );
};

export default ProfilePage;
