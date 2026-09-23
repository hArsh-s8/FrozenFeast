import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaCreditCard, FaMobileAlt, FaTimes, FaShieldAlt } from 'react-icons/fa';
import './DummyPaymentModal.css';

const DummyPaymentModal = ({ isOpen, onClose, totalAmount, onSuccess, onFailure }) => {
    const [activeTab, setActiveTab] = useState('card'); // 'card' | 'upi'
    const [isSimulatingFailure, setIsSimulatingFailure] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);

    if (!isOpen) return null;

    const handlePay = () => {
        setIsProcessing(true);
        setTimeout(() => {
            setIsProcessing(false);
            if (isSimulatingFailure) {
                onFailure("Simulated payment rejection: Card/UPI transaction declined by issuing bank.");
            } else {
                onSuccess({
                    razorpay_order_id: `dummy_order_${Date.now()}`,
                    razorpay_payment_id: `pay_sim_${Date.now()}`,
                    razorpay_signature: `sim_sig_${Date.now()}`,
                    isDummy: true
                });
            }
        }, 1500);
    };

    return (
        <AnimatePresence>
            <div className="dummy-modal-overlay">
                <motion.div
                    className="dummy-modal-card"
                    initial={{ opacity: 0, scale: 0.92, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.92, y: 20 }}
                    transition={{ type: "spring", stiffness: 350, damping: 25 }}
                >
                    <div className="dummy-modal-header">
                        <div className="dummy-badge">🧪 Test Sandbox Mode</div>
                        <button className="dummy-close-btn" onClick={onClose} disabled={isProcessing}>
                            <FaTimes />
                        </button>
                    </div>

                    <div className="dummy-amount-section">
                        <span className="dummy-amount-label">Payment Amount</span>
                        <h2 className="dummy-amount-value">₹{Number(totalAmount).toFixed(2)}</h2>
                        <p className="dummy-amount-note">Razorpay keys not yet configured — using test payment simulator</p>
                    </div>

                    {/* Method Tabs */}
                    <div className="dummy-tabs">
                        <button
                            className={`dummy-tab-btn ${activeTab === 'card' ? 'active' : ''}`}
                            onClick={() => setActiveTab('card')}
                            disabled={isProcessing}
                        >
                            <FaCreditCard /> Test Card
                        </button>
                        <button
                            className={`dummy-tab-btn ${activeTab === 'upi' ? 'active' : ''}`}
                            onClick={() => setActiveTab('upi')}
                            disabled={isProcessing}
                        >
                            <FaMobileAlt /> Test UPI
                        </button>
                    </div>

                    {/* Tab Body */}
                    <div className="dummy-tab-content">
                        {activeTab === 'card' ? (
                            <div className="dummy-card-preview">
                                <div className="dummy-card-chip"></div>
                                <div className="dummy-card-number">4111 •••• •••• 4444</div>
                                <div className="dummy-card-footer">
                                    <span>TEST USER</span>
                                    <span>EXP: 12/28</span>
                                </div>
                            </div>
                        ) : (
                            <div className="dummy-upi-preview">
                                <span className="dummy-upi-label">UPI ID (Pre-filled):</span>
                                <div className="dummy-upi-id">success@razorpay</div>
                                <span className="dummy-upi-sub">Instant simulated UPI clearance</span>
                            </div>
                        )}
                    </div>

                    {/* Simulate Failure Switch */}
                    <div className="dummy-simulate-toggle">
                        <label className="toggle-label">
                            <input
                                type="checkbox"
                                checked={isSimulatingFailure}
                                onChange={(e) => setIsSimulatingFailure(e.target.checked)}
                                disabled={isProcessing}
                            />
                            <span className="toggle-slider"></span>
                            <span className="toggle-text">
                                {isSimulatingFailure ? "Simulate Payment Failure ❌" : "Simulate Payment Success ✅"}
                            </span>
                        </label>
                    </div>

                    {/* Action Button */}
                    <button
                        className={`dummy-pay-btn ${isSimulatingFailure ? 'btn-failure-mode' : ''}`}
                        onClick={handlePay}
                        disabled={isProcessing}
                    >
                        {isProcessing ? (
                            <span className="dummy-processing-text">
                                <span className="dummy-spinner"></span> Processing Securely...
                            </span>
                        ) : (
                            <span>{isSimulatingFailure ? `Fail Pay ₹${Number(totalAmount).toFixed(2)}` : `Pay ₹${Number(totalAmount).toFixed(2)} Now`}</span>
                        )}
                    </button>

                    <div className="dummy-secure-notice">
                        <FaShieldAlt /> 256-bit Encrypted Test Gateway
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default DummyPaymentModal;
