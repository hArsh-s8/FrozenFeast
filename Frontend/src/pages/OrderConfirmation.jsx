import React, { useEffect, useState } from 'react';
import { useParams, useLocation, NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    FaCheckCircle,
    FaIceCream,
    FaMapMarkerAlt,
    FaReceipt,
    FaUserCheck,
    FaClock,
    FaShoppingBag
} from 'react-icons/fa';
import './OrderConfirmation.css';
import { API_VERSION_URL } from '../config';

const OrderConfirmation = () => {
    const { orderId } = useParams();
    const location = useLocation();
    const token = localStorage.getItem('token');

    // Use state passed from checkout or fetch from backend
    const [order, setOrder] = useState(location.state?.order || null);
    const [loading, setLoading] = useState(!order);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (order) return;

        const fetchOrder = async () => {
            if (!token) {
                setError('Please log in to view order confirmation.');
                setLoading(false);
                return;
            }

            try {
                const res = await fetch(`${API_VERSION_URL}/orders/${orderId}`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                const data = await res.json();
                if (data.success && data.order) {
                    setOrder(data.order);
                } else {
                    setError(data.message || 'Order could not be found.');
                }
            } catch (err) {
                console.error('Fetch order error:', err);
                setError('Failed to fetch order details.');
            } finally {
                setLoading(false);
            }
        };

        fetchOrder();
    }, [orderId, order, token]);

    if (loading) {
        return (
            <div className="order-confirm-loading">
                <div className="confirm-spinner"></div>
                <p>Retrieving your order confirmation...</p>
            </div>
        );
    }

    if (error || !order) {
        return (
            <div className="order-confirm-error">
                <h2>Order Details Unavailable</h2>
                <p>{error || "We couldn't retrieve the details for this order."}</p>
                <NavLink to="/profile" className="btn-confirm-home">
                    View Orders in Profile
                </NavLink>
            </div>
        );
    }

    const isPaid = order.paymentStatus === 'paid';
    const isCod = order.paymentMethod === 'cod';

    return (
        <div className="order-confirmation-page">
            {/* Celebratory Banner */}
            <motion.div
                className="confirm-hero"
                initial={{ opacity: 0, scale: 0.95, y: -20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.5 }}
            >
                <div className="confirm-icon-pulse">
                    <FaCheckCircle className="confirm-check-icon" />
                </div>
                <h1 className="confirm-title">Order Placed Successfully!</h1>
                <p className="confirm-subtitle">
                    Thank you for ordering with <strong>FrozenFeast</strong>! Your artisanal treats are being prepped.
                </p>
                <div className="confirm-order-id-tag">
                    <span>Order #{order.orderId}</span>
                </div>
            </motion.div>

            {/* Visual Delivery Tracker */}
            <motion.div
                className="delivery-tracker-card"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
            >
                <div className="tracker-header">
                    <div className="tracker-eta">
                        <FaClock className="tracker-eta-icon" />
                        <div>
                            <span className="eta-label">Estimated Delivery</span>
                            <strong className="eta-val">30 - 45 Minutes</strong>
                        </div>
                    </div>
                    <div className="tracker-status-tag">
                        Status: <span className="status-highlight">{order.orderStatus || 'Placed'}</span>
                    </div>
                </div>

                <div className="tracker-steps">
                    <div className="tracker-step active completed">
                        <div className="step-circle">✓</div>
                        <span className="step-label">Order Placed</span>
                    </div>
                    <div className="tracker-bar active"></div>
                    <div className="tracker-step active">
                        <div className="step-circle">2</div>
                        <span className="step-label">Preparing Scoops</span>
                    </div>
                    <div className="tracker-bar"></div>
                    <div className="tracker-step">
                        <div className="step-circle">3</div>
                        <span className="step-label">Out for Delivery</span>
                    </div>
                    <div className="tracker-bar"></div>
                    <div className="tracker-step">
                        <div className="step-circle">4</div>
                        <span className="step-label">Delivered</span>
                    </div>
                </div>
            </motion.div>

            {/* Grid: Order Breakdown & Delivery Details */}
            <div className="confirm-details-grid">
                {/* Left: Ordered Items & Bill */}
                <motion.div
                    className="confirm-card"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 }}
                >
                    <div className="confirm-card-head">
                        <FaReceipt className="head-icon" />
                        <h3>Order Receipt</h3>
                    </div>

                    <div className="confirm-items-list">
                        {(order.items || []).map((item, idx) => (
                            <div key={idx} className="confirm-item-row">
                                <div className="confirm-item-left">
                                    {item.iceUrl && (
                                        <img
                                            src={item.iceUrl}
                                            alt={item.iceName || item.name}
                                            className="confirm-item-img"
                                        />
                                    )}
                                    <div>
                                        <span className="confirm-item-title">{item.iceName || item.name}</span>
                                        <span className="confirm-item-qty">Qty: {item.quantity} × ₹{Number(item.price).toFixed(2)}</span>
                                    </div>
                                </div>
                                <span className="confirm-item-total">
                                    ₹{((Number(item.price) || 0) * (Number(item.quantity) || 1)).toFixed(2)}
                                </span>
                            </div>
                        ))}
                    </div>

                    <div className="confirm-bill-breakdown">
                        <div className="bill-row">
                            <span>Subtotal</span>
                            <span>₹{Number(order.subtotal || order.total).toFixed(2)}</span>
                        </div>
                        <div className="bill-row">
                            <span>Delivery Fee</span>
                            <span>{Number(order.deliveryFee) === 0 ? 'FREE' : `₹${Number(order.deliveryFee).toFixed(2)}`}</span>
                        </div>
                        <div className="bill-row">
                            <span>Taxes (5% GST)</span>
                            <span>₹{Number(order.tax || 0).toFixed(2)}</span>
                        </div>
                        <div className="bill-divider"></div>
                        <div className="bill-row grand-total">
                            <span>Total Paid</span>
                            <span className="grand-val">₹{Number(order.total).toFixed(2)}</span>
                        </div>
                    </div>
                </motion.div>

                {/* Right: Payment & Delivery Information */}
                <motion.div
                    className="confirm-card"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 }}
                >
                    {/* Payment Info */}
                    <div className="confirm-card-head">
                        <FaIceCream className="head-icon" />
                        <h3>Payment Details</h3>
                    </div>

                    <div className="payment-receipt-box">
                        <div className="receipt-line">
                            <span className="receipt-key">Payment Method:</span>
                            <span className="receipt-val">
                                {isCod
                                    ? 'Cash on Delivery (COD)'
                                    : order.paymentMethod === 'dummy'
                                    ? 'Online Payment (Sandbox Simulator)'
                                    : 'Online Payment (Razorpay)'}
                            </span>
                        </div>
                        <div className="receipt-line">
                            <span className="receipt-key">Payment Status:</span>
                            <span className={`payment-status-badge ${isPaid ? 'paid' : 'pending'}`}>
                                {isPaid ? '✓ Paid' : '⏳ Pending (Pay upon delivery)'}
                            </span>
                        </div>
                        {order.paymentId && (
                            <div className="receipt-line">
                                <span className="receipt-key">Transaction Ref:</span>
                                <span className="receipt-code">{order.paymentId}</span>
                            </div>
                        )}
                        <div className="receipt-line">
                            <span className="receipt-key">Amount:</span>
                            <strong className="receipt-amt">₹{Number(order.total).toFixed(2)}</strong>
                        </div>
                    </div>

                    {/* Delivery Address Snapshot */}
                    <div className="confirm-card-head" style={{ marginTop: '24px' }}>
                        <FaMapMarkerAlt className="head-icon" />
                        <h3>Delivering To</h3>
                    </div>

                    <div className="delivery-snapshot-box">
                        {order.deliveryAddress?.name ? (
                            <>
                                <p className="snapshot-name">{order.deliveryAddress.name}</p>
                                <p className="snapshot-text">
                                    {order.deliveryAddress.streetAdd}, {order.deliveryAddress.city},{' '}
                                    {order.deliveryAddress.district} — {order.deliveryAddress.pin}
                                </p>
                                {order.deliveryAddress.contact && (
                                    <p className="snapshot-contact">📞 {order.deliveryAddress.contact}</p>
                                )}
                            </>
                        ) : (
                            <p className="snapshot-text">Address details recorded on account</p>
                        )}
                    </div>

                    {/* Navigation Actions */}
                    <div className="confirm-actions">
                        <NavLink to="/products" className="btn-confirm-more">
                            <FaShoppingBag /> Order More Treats
                        </NavLink>
                        <NavLink to="/profile" className="btn-confirm-profile">
                            <FaUserCheck /> View in Profile
                        </NavLink>
                    </div>
                </motion.div>
            </div>
        </div>
    );
};

export default OrderConfirmation;
