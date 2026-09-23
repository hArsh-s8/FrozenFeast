import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaExclamationTriangle, FaRedo, FaArrowLeft } from 'react-icons/fa';
import './PaymentFailureModal.css';

const PaymentFailureModal = ({ isOpen, onClose, onRetry, message, onBackToCart }) => {
    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="payment-modal-overlay" onClick={onClose}>
                <motion.div
                    className="payment-modal-card failure-card"
                    onClick={(e) => e.stopPropagation()}
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 20 }}
                    transition={{ type: "spring", stiffness: 350, damping: 25 }}
                >
                    <div className="modal-icon-wrap failure-icon">
                        <FaExclamationTriangle />
                    </div>

                    <h2 className="modal-title">Payment Unsuccessful</h2>
                    <p className="modal-subtitle">
                        {message || "Your payment could not be processed. No funds were debited, and your cart has been safely preserved."}
                    </p>

                    <div className="cart-safe-badge">
                        <span>🛡️ Your cart items are safe and ready</span>
                    </div>

                    <div className="modal-actions">
                        <button className="btn-retry" onClick={onRetry}>
                            <FaRedo className="btn-icon" /> Try Again
                        </button>
                        <button className="btn-back-cart" onClick={onBackToCart}>
                            <FaArrowLeft className="btn-icon" /> Back to Cart
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default PaymentFailureModal;
