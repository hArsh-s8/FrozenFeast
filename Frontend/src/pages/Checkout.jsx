import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, NavLink } from 'react-router-dom';
import {
    FaArrowLeft,
    FaCreditCard,
    FaMoneyBillWave,
    FaShieldAlt,
    FaMapMarkerAlt,
    FaPlus,
    FaIceCream
} from 'react-icons/fa';
import './Checkout.css';
import { API_VERSION_URL } from '../config';
import PaymentFailureModal from '../Components/PaymentFailureModal';
import DummyPaymentModal from '../Components/DummyPaymentModal';

const BASE_URL = API_VERSION_URL;

// Helper to load Razorpay Checkout script dynamically
const loadRazorpayScript = () => {
    return new Promise((resolve) => {
        if (window.Razorpay) {
            resolve(true);
            return;
        }
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.onload = () => resolve(true);
        script.onerror = () => resolve(false);
        document.body.appendChild(script);
    });
};

const Checkout = ({ cartItems = [], setCartItems }) => {
    const navigate = useNavigate();
    const token = localStorage.getItem('token');

    // Addresses
    const [addressList, setAddressList] = useState([]);
    const [selectedAddress, setSelectedAddress] = useState(null);
    const [loadingAddresses, setLoadingAddresses] = useState(true);

    // Payment Selection
    const [paymentMethod, setPaymentMethod] = useState('razorpay'); // 'razorpay' | 'cod'
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Failure / Dummy Modals
    const [showFailureModal, setShowFailureModal] = useState(false);
    const [failureMessage, setFailureMessage] = useState('');
    const [showDummyModal, setShowDummyModal] = useState(false);

    // Totals Calculation
    const subtotal = cartItems.reduce(
        (sum, item) => sum + ((Number(item.price) || 0) * (Number(item.quantity) || 1)),
        0
    );
    const deliveryFee = subtotal >= 300 || subtotal === 0 ? 0 : 40;
    const tax = Math.round(subtotal * 0.05);
    const totalAmount = subtotal + deliveryFee + tax;

    // Check user authentication
    useEffect(() => {
        if (!token) {
            navigate('/login');
        }
    }, [token, navigate]);

    // Fetch saved addresses
    const fetchAddresses = useCallback(async () => {
        if (!token) return;
        try {
            setLoadingAddresses(true);
            const response = await fetch(`${BASE_URL}/deliveries`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const data = await response.json();
            if (data.success && data.deliveries) {
                setAddressList(data.deliveries);
                if (data.deliveries.length > 0 && !selectedAddress) {
                    setSelectedAddress(data.deliveries[0]._id);
                }
            }
        } catch (error) {
            console.error('Error fetching addresses:', error);
        } finally {
            setLoadingAddresses(false);
        }
    }, [token, selectedAddress]);

    useEffect(() => {
        fetchAddresses();
    }, [fetchAddresses]);

    // Redirect to cart if empty and not in middle of success
    useEffect(() => {
        if (cartItems.length === 0 && !isSubmitting) {
            // Cart is empty, give user a moment or let them see
        }
    }, [cartItems, isSubmitting]);

    // Handle Payment Failure
    const handlePaymentFailed = (errMsg) => {
        setIsSubmitting(false);
        setFailureMessage(errMsg || 'Your payment was declined or could not be completed.');
        setShowFailureModal(true);
    };

    // Handle User Payment Cancellation
    const handlePaymentCancelled = () => {
        setIsSubmitting(false);
        setFailureMessage('Payment was cancelled. Your cart items are intact and ready whenever you are.');
        setShowFailureModal(true);
    };

    // Verify & Finalize Online / Dummy Payment on Backend
    const verifyAndConfirmPayment = async (paymentResponse) => {
        try {
            setIsSubmitting(true);
            const verifyRes = await fetch(`${BASE_URL}/payment/verify`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    razorpay_order_id: paymentResponse.razorpay_order_id,
                    razorpay_payment_id: paymentResponse.razorpay_payment_id,
                    razorpay_signature: paymentResponse.razorpay_signature,
                    items: cartItems,
                    addressId: selectedAddress,
                    deliveryFee,
                    tax,
                    isDummy: Boolean(paymentResponse.isDummy)
                })
            });

            const verifyData = await verifyRes.json();

            if (verifyData.success && verifyData.order) {
                // Clear cart state
                setCartItems([]);
                setShowDummyModal(false);
                setShowFailureModal(false);
                navigate(`/order-confirmation/${verifyData.order.orderId}`, {
                    state: { order: verifyData.order }
                });
            } else {
                handlePaymentFailed(verifyData.message || 'Payment signature verification failed.');
            }
        } catch (err) {
            console.error('Verification error:', err);
            handlePaymentFailed('Network error verifying payment. Please contact support.');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Handle Online Payment (Razorpay or Sandbox Fallback)
    const handleOnlinePayment = async () => {
        if (!selectedAddress) {
            alert('Please select or add a delivery address.');
            return;
        }

        setIsSubmitting(true);

        try {
            // 1. Create order on backend
            const createRes = await fetch(`${BASE_URL}/payment/create-order`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    items: cartItems,
                    addressId: selectedAddress,
                    deliveryFee,
                    tax
                })
            });

            const orderData = await createRes.json();

            if (!orderData.success) {
                handlePaymentFailed(orderData.message || 'Failed to initialize payment.');
                return;
            }

            // 2. If Razorpay keys are not configured, launch Dummy Simulator Modal
            if (orderData.isDummy) {
                setIsSubmitting(false);
                setShowDummyModal(true);
                return;
            }

            // 3. Load Razorpay script
            const isLoaded = await loadRazorpayScript();
            if (!isLoaded) {
                // If script blocked or offline, offer dummy simulator fallback
                setIsSubmitting(false);
                setShowDummyModal(true);
                return;
            }

            // 4. Find address details for prefill
            const activeAddress = addressList.find(a => a._id === selectedAddress);

            // 5. Open Razorpay Checkout modal
            const options = {
                key: orderData.keyId,
                amount: orderData.amount,
                currency: orderData.currency || 'INR',
                name: 'FrozenFeast',
                description: 'Ice Cream Artisanal Order',
                order_id: orderData.orderId,
                prefill: {
                    name: activeAddress?.name || '',
                    contact: activeAddress?.contact || ''
                },
                theme: {
                    color: '#e040fb'
                },
                handler: function (response) {
                    verifyAndConfirmPayment(response);
                },
                modal: {
                    ondismiss: function () {
                        handlePaymentCancelled();
                    }
                }
            };

            const rzp = new window.Razorpay(options);

            rzp.on('payment.failed', function (response) {
                console.error('Razorpay payment failed:', response.error);
                handlePaymentFailed(response.error.description || 'Payment was declined.');
            });

            rzp.open();
        } catch (error) {
            console.error('Razorpay checkout error:', error);
            handlePaymentFailed('Unable to initiate online checkout. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Handle Cash on Delivery (COD)
    const handleCodPayment = async () => {
        if (!selectedAddress) {
            alert('Please select or add a delivery address.');
            return;
        }

        setIsSubmitting(true);
        try {
            const response = await fetch(`${BASE_URL}/payment/cod`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    items: cartItems,
                    addressId: selectedAddress,
                    deliveryFee,
                    tax
                })
            });

            const data = await response.json();

            if (data.success && data.order) {
                setCartItems([]);
                navigate(`/order-confirmation/${data.order.orderId}`, {
                    state: { order: data.order }
                });
            } else {
                handlePaymentFailed(data.message || 'Failed to place COD order.');
            }
        } catch (error) {
            console.error('COD order error:', error);
            handlePaymentFailed('Network error placing COD order. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Main Submit Action
    const handlePlaceOrder = () => {
        if (paymentMethod === 'razorpay') {
            handleOnlinePayment();
        } else {
            handleCodPayment();
        }
    };

    if (cartItems.length === 0) {
        return (
            <div className="checkout-empty-page">
                <h2>No items to checkout</h2>
                <p>Your cart is empty. Pick some mouthwatering ice creams!</p>
                <NavLink to="/products" className="checkout-shop-btn">
                    Browse Menu
                </NavLink>
            </div>
        );
    }

    return (
        <div className="checkout-page">
            {/* Top Stepper Breadcrumb */}
            <div className="checkout-stepper">
                <div className="step completed">
                    <span className="step-num">✓</span>
                    <span className="step-label">Cart</span>
                </div>
                <div className="step-line active"></div>
                <div className="step active">
                    <span className="step-num">2</span>
                    <span className="step-label">Checkout</span>
                </div>
                <div className="step-line"></div>
                <div className="step">
                    <span className="step-num">3</span>
                    <span className="step-label">Payment</span>
                </div>
                <div className="step-line"></div>
                <div className="step">
                    <span className="step-num">4</span>
                    <span className="step-label">Confirmation</span>
                </div>
            </div>

            <div className="checkout-back-link">
                <NavLink to="/cart">
                    <FaArrowLeft /> Back to Cart
                </NavLink>
            </div>

            <div className="checkout-layout">
                {/* Left Column: Address, Items, Payment Method */}
                <div className="checkout-left-col">
                    {/* 1. Delivery Address Section */}
                    <div className="checkout-card">
                        <div className="checkout-card-header">
                            <div className="card-title-wrap">
                                <FaMapMarkerAlt className="card-icon" />
                                <h3>Delivery Address</h3>
                            </div>
                            <NavLink to="/delivery" className="add-address-link">
                                <FaPlus /> Add New
                            </NavLink>
                        </div>

                        {loadingAddresses ? (
                            <p className="checkout-loading">Loading saved addresses...</p>
                        ) : addressList.length === 0 ? (
                            <div className="no-address-box">
                                <p>No saved delivery addresses found.</p>
                                <NavLink to="/delivery" className="btn-add-first-address">
                                    + Add Address to Proceed
                                </NavLink>
                            </div>
                        ) : (
                            <div className="checkout-address-grid">
                                {addressList.map((addr) => (
                                    <label
                                        key={addr._id}
                                        className={`checkout-address-card ${selectedAddress === addr._id ? 'selected' : ''}`}
                                    >
                                        <input
                                            type="radio"
                                            name="checkoutAddress"
                                            value={addr._id}
                                            checked={selectedAddress === addr._id}
                                            onChange={() => setSelectedAddress(addr._id)}
                                        />
                                        <div className="addr-content">
                                            <div className="addr-top">
                                                <span className="addr-name">{addr.name}</span>
                                                {selectedAddress === addr._id && (
                                                    <span className="addr-selected-tag">Selected</span>
                                                )}
                                            </div>
                                            <p className="addr-text">
                                                {addr.streetAdd}, {addr.city}, {addr.district} — {addr.pin}
                                            </p>
                                            {addr.contact && <p className="addr-phone">📞 {addr.contact}</p>}
                                        </div>
                                    </label>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* 2. Order Items Review */}
                    <div className="checkout-card">
                        <div className="checkout-card-header">
                            <div className="card-title-wrap">
                                <FaIceCream className="card-icon" />
                                <h3>Order Items ({cartItems.reduce((s, i) => s + (i.quantity || 1), 0)})</h3>
                            </div>
                            <NavLink to="/cart" className="edit-cart-link">
                                Edit Cart
                            </NavLink>
                        </div>

                        <div className="checkout-items-list">
                            {cartItems.map((item) => (
                                <div key={item._id} className="checkout-item-row">
                                    <div className="checkout-item-left">
                                        {item.iceUrl && (
                                            <img
                                                src={item.iceUrl}
                                                alt={item.iceName || item.name}
                                                className="checkout-item-thumb"
                                            />
                                        )}
                                        <div className="checkout-item-info">
                                            <span className="checkout-item-name">{item.iceName || item.name}</span>
                                            <span className="checkout-item-tag">{item.tags || 'Ice Cream'}</span>
                                        </div>
                                    </div>
                                    <div className="checkout-item-right">
                                        <span className="checkout-item-qty">Qty: {item.quantity || 1}</span>
                                        <span className="checkout-item-price">
                                            ₹{((Number(item.price) || 0) * (Number(item.quantity) || 1)).toFixed(2)}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* 3. Payment Method Options */}
                    <div className="checkout-card">
                        <div className="checkout-card-header">
                            <div className="card-title-wrap">
                                <FaCreditCard className="card-icon" />
                                <h3>Select Payment Method</h3>
                            </div>
                        </div>

                        <div className="payment-options-list">
                            {/* Online Payment (Razorpay) */}
                            <label
                                className={`payment-option-card ${paymentMethod === 'razorpay' ? 'selected' : ''}`}
                            >
                                <input
                                    type="radio"
                                    name="paymentMethod"
                                    value="razorpay"
                                    checked={paymentMethod === 'razorpay'}
                                    onChange={() => setPaymentMethod('razorpay')}
                                />
                                <div className="payment-option-icon online-icon">
                                    <FaCreditCard />
                                </div>
                                <div className="payment-option-details">
                                    <div className="payment-option-title">
                                        <span>Online Payment (Razorpay Test Mode)</span>
                                        <span className="badge-secure">Instant</span>
                                    </div>
                                    <p className="payment-option-desc">
                                        UPI (Google Pay, PhonePe, Paytm), Credit/Debit Cards, Netbanking & Wallets.
                                    </p>
                                </div>
                            </label>

                            {/* Cash on Delivery (COD) */}
                            <label
                                className={`payment-option-card ${paymentMethod === 'cod' ? 'selected' : ''}`}
                            >
                                <input
                                    type="radio"
                                    name="paymentMethod"
                                    value="cod"
                                    checked={paymentMethod === 'cod'}
                                    onChange={() => setPaymentMethod('cod')}
                                />
                                <div className="payment-option-icon cod-icon">
                                    <FaMoneyBillWave />
                                </div>
                                <div className="payment-option-details">
                                    <div className="payment-option-title">
                                        <span>Cash on Delivery</span>
                                        <span className="badge-cod">Pay on Delivery</span>
                                    </div>
                                    <p className="payment-option-desc">
                                        Pay with cash to our delivery driver when your scoops arrive.
                                    </p>
                                </div>
                            </label>
                        </div>
                    </div>
                </div>

                {/* Right Column: Order Summary & Pay Action */}
                <div className="checkout-right-col">
                    <div className="checkout-summary-card">
                        <h3>Payment Summary</h3>

                        <div className="summary-breakdown">
                            <div className="summary-line">
                                <span>Items Subtotal</span>
                                <span>₹{subtotal.toFixed(2)}</span>
                            </div>
                            <div className="summary-line">
                                <span>Delivery Fee</span>
                                <span className={deliveryFee === 0 ? 'free-delivery' : ''}>
                                    {deliveryFee === 0 ? 'FREE' : `₹${deliveryFee.toFixed(2)}`}
                                </span>
                            </div>
                            {subtotal < 300 && (
                                <p className="free-delivery-tip">
                                    Add ₹{(300 - subtotal).toFixed(2)} more for FREE delivery!
                                </p>
                            )}
                            <div className="summary-line">
                                <span>GST & Restaurant Taxes (5%)</span>
                                <span>₹{tax.toFixed(2)}</span>
                            </div>

                            <div className="summary-divider"></div>

                            <div className="summary-line grand-total-line">
                                <span>Grand Total</span>
                                <span className="grand-total-val">₹{totalAmount.toFixed(2)}</span>
                            </div>
                        </div>

                        {/* Pay Button */}
                        <button
                            className="btn-pay-now"
                            onClick={handlePlaceOrder}
                            disabled={isSubmitting || !selectedAddress || cartItems.length === 0}
                        >
                            {isSubmitting ? (
                                <span className="btn-loading-content">
                                    <span className="btn-spinner"></span> Processing...
                                </span>
                            ) : paymentMethod === 'razorpay' ? (
                                <span>Pay ₹{totalAmount.toFixed(2)} Online</span>
                            ) : (
                                <span>Confirm COD Order (₹{totalAmount.toFixed(2)})</span>
                            )}
                        </button>

                        <div className="checkout-security-badge">
                            <FaShieldAlt className="shield-icon" />
                            <span>100% Safe & Secure Checkout | FrozenFeast Guarantee</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Payment Failure Modal */}
            <PaymentFailureModal
                isOpen={showFailureModal}
                onClose={() => setShowFailureModal(false)}
                onRetry={() => {
                    setShowFailureModal(false);
                    handlePlaceOrder();
                }}
                message={failureMessage}
                onBackToCart={() => {
                    setShowFailureModal(false);
                    navigate('/cart');
                }}
            />

            {/* Dummy Payment Simulator Modal (Fallback when keys aren't provided) */}
            <DummyPaymentModal
                isOpen={showDummyModal}
                onClose={() => setShowDummyModal(false)}
                totalAmount={totalAmount}
                onSuccess={(simResponse) => {
                    verifyAndConfirmPayment(simResponse);
                }}
                onFailure={(simError) => {
                    setShowDummyModal(false);
                    handlePaymentFailed(simError);
                }}
            />
        </div>
    );
};

export default Checkout;
