import React, { useState, useEffect, useCallback } from "react";
import './Cart.css';
import CartCard from "../Components/CartCard";
import { NavLink, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

import { API_VERSION_URL } from "../config";

const BASE_URL = API_VERSION_URL;

const Cart = ({ addedProducts = [], setCartItems }) => {
    const [cartProducts, setCartProductsLocal] = useState([]);
    const [totalAmount, setTotalAmount] = useState(0);
    const [addressList, setAddressList] = useState([]);
    const [selectedAddress, setSelectedAddress] = useState(null);
    const [loadingAddresses, setLoadingAddresses] = useState(true);
    const [addressError, setAddressError] = useState(null);
    const [orderHistory, setOrderHistory] = useState([]);

    const navigate = useNavigate();
    const token = localStorage.getItem('token');

    // Fetch saved addresses
    const fetchAddress = useCallback(async () => {
        try {
            setLoadingAddresses(true);
            setAddressError(null);
            if (!token) {
                setAddressError("Please log in to view your saved addresses.");
                return;
            }

            const response = await fetch(`${BASE_URL}/deliveries`, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                }
            });

            const responseData = await response.json();

            if (responseData.success) {
                setAddressList(responseData.deliveries || []);
                if (responseData.deliveries && responseData.deliveries.length > 0) {
                    setSelectedAddress(responseData.deliveries[0]._id);
                }
            } else {
                throw new Error(responseData.message || 'Failed to fetch addresses');
            }
        } catch (error) {
            setAddressError(error.message);
            setAddressList([]);
        } finally {
            setLoadingAddresses(false);
        }
    }, [token]);

    // Fetch order history from database
    const fetchOrderHistory = useCallback(async () => {
        if (!token) return;
        try {
            const res = await fetch(`${BASE_URL}/orders`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                setOrderHistory(data.recentOrders || []);
            }
        } catch (e) {
            console.error("Error fetching orders:", e);
        }
    }, [token]);

    useEffect(() => {
        fetchAddress();
        fetchOrderHistory();
    }, [fetchAddress, fetchOrderHistory]);

    useEffect(() => {
        const productWithQuantity = addedProducts.map((item) => ({
            ...item,
            quantity: item.quantity || 1,
        }));
        setCartProductsLocal(productWithQuantity);
    }, [addedProducts]);

    useEffect(() => {
        const total = cartProducts.reduce(
            (acc, item) => acc + (item.price * item.quantity || 0),
            0
        );
        setTotalAmount(total);
    }, [cartProducts]);

    const removeFromCartHandler = (product) => {
        const newCart = cartProducts.filter((item) => item._id !== product._id);
        setCartProductsLocal(newCart);
        setCartItems(newCart);
    };

    const updateQuantityHandler = (productId, newQuantity) => {
        if (newQuantity < 1) return;
        const updatedCart = cartProducts.map((item) =>
            item._id === productId ? { ...item, quantity: newQuantity } : item
        );
        setCartProductsLocal(updatedCart);
        setCartItems(updatedCart);
    };

    const handleProceedToCheckout = () => {
        if (!token) {
            alert("Please log in to proceed to checkout.");
            navigate('/login');
            return;
        }
        if (cartProducts.length === 0) {
            alert("Your cart is empty.");
            return;
        }
        navigate('/checkout');
    };

    const renderOrderHistory = () => {
        if (orderHistory.length === 0) return null;
        return (
            <div className="order-history-section">
                <h2>Previous Orders</h2>
                <div className="history-list">
                    {orderHistory.map((order, idx) => (
                        <motion.div
                            key={order.orderId || idx}
                            className="history-card"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.05 }}
                        >
                            <div className="history-header">
                                <div className="history-meta">
                                    <span className="history-date">
                                        {order.date
                                            ? new Date(order.date).toLocaleDateString('en-IN', {
                                                day: 'numeric', month: 'short', year: 'numeric'
                                            })
                                            : "Unknown date"}
                                    </span>
                                    <span className="history-time">
                                        {order.date
                                            ? new Date(order.date).toLocaleTimeString('en-IN', {
                                                hour: '2-digit', minute: '2-digit'
                                            })
                                            : ""}
                                    </span>
                                </div>
                                <div className="history-right">
                                    <span className={`order-status status-${(order.status || 'placed').toLowerCase()}`}>
                                        {order.status || "Placed"}
                                    </span>
                                    <span className="history-total">₹{Number(order.total).toFixed(2)}</span>
                                </div>
                            </div>
                            <div className="history-items">
                                {(order.items || []).map((item, i) => (
                                    <span key={i} className="history-item-badge">
                                        {item.quantity}× {item.iceName || item.name || "Item"}
                                    </span>
                                ))}
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        );
    };

    if (addedProducts.length === 0) {
        return (
            <div className="cart-page flex-col">
                <div className="cart-empty">
                    <h2>Your cart is empty</h2>
                    <NavLink to="/products" className="shop-now-btn">
                        Shop Now
                    </NavLink>
                </div>
                {renderOrderHistory()}
            </div>
        );
    }

    return (
        <div className="cart-page flex-col">
            <div className="cart-content">
                <div className="cart-items-section">
                    {cartProducts.map((product) => (
                        <CartCard
                            key={product._id}
                            image={product.iceUrl}
                            name={product.iceName}
                            price={product.price}
                            description={product.description}
                            tag={product.tags}
                            quantity={product.quantity}
                            removeFromCart={() => removeFromCartHandler(product)}
                            onQuantityChange={(newQty) =>
                                updateQuantityHandler(product._id, newQty)
                            }
                        />
                    ))}
                </div>

                <div className="cart-summary-section">
                    <h2>Order Summary</h2>
                    <div className="summary-row">
                        <span>Items</span>
                        <span>{cartProducts.reduce((acc, item) => acc + item.quantity, 0)}</span>
                    </div>
                    <div className="summary-row summary-total">
                        <span>Total</span>
                        <span>₹{totalAmount.toFixed(2)}</span>
                    </div>

                    <h3>Delivery Address</h3>
                    {loadingAddresses ? (
                        <p className="loading-text">Loading addresses...</p>
                    ) : addressError ? (
                        <p className="error-message">{addressError}</p>
                    ) : addressList.length === 0 ? (
                        <p className="no-address-msg">
                            No saved addresses. <NavLink to="/delivery">Add one →</NavLink>
                        </p>
                    ) : (
                        <div className="address-list">
                            {addressList.map((add) => (
                                <label key={add._id} className={`address-card ${selectedAddress === add._id ? 'selected' : ''}`}>
                                    <input
                                        type="radio"
                                        name="selectAddress"
                                        value={add._id}
                                        checked={selectedAddress === add._id}
                                        onChange={() => setSelectedAddress(add._id)}
                                    />
                                    <div className="address-details">
                                        <p className="address-name">{add.name}</p>
                                        <p>{add.streetAdd}, {add.city}, {add.district} — {add.pin}</p>
                                        {add.contact && <p className="address-phone">📞 {add.contact}</p>}
                                    </div>
                                </label>
                            ))}
                        </div>
                    )}

                    <button
                        className="checkout-btn"
                        onClick={handleProceedToCheckout}
                        disabled={cartProducts.length === 0}
                    >
                        Proceed to Checkout (₹{totalAmount.toFixed(2)}) →
                    </button>
                </div>
            </div>
            {renderOrderHistory()}
        </div>
    );
};

export default Cart;
