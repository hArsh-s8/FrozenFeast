import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FaUserAlt, FaPhoneAlt, FaMapMarkerAlt, FaCity, FaMapPin, FaCheckCircle, FaExclamationCircle, FaTruck } from "react-icons/fa";
import './Delivery.css';
import { API_VERSION_URL } from '../config';

import { useAuth } from '../context/AuthContext';

const Delivery = () => {
    const { user } = useAuth();
    const [deliveryData, setDeliveryData] = useState({
        name: "", contact: "", streetAdd: "", city: "", pin: "", district: ""
    });

    const [loading, setLoading] = useState(false); 
    const [showPopup, setShowPopup] = useState(false);
    const [popupMessage, setPopupMessage] = useState(""); 
    const [isError, setIsError] = useState(false); 

    function changeHandler(event) {
        const { name, value } = event.target;
        setDeliveryData(prev => ({ ...prev, [name]: value }));
    }

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!deliveryData.name || !deliveryData.contact || !deliveryData.streetAdd || !deliveryData.city || !deliveryData.pin || !deliveryData.district) {
            setPopupMessage("Please fill in all required fields.");
            setIsError(true);
            setShowPopup(true);
            setTimeout(() => setShowPopup(false), 3000);
            return;
        }

        setLoading(true);
        try {
            if (!user) {
                throw new Error("Please log in to submit delivery details.");
            }

            const response = await fetch(`${API_VERSION_URL}/user/delivery`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify(deliveryData),
            });

            const responseData = await response.json();

            if (response.ok && responseData.success) {
                setDeliveryData({ name: "", contact: "", streetAdd: "", city: "", pin: "", district: "" });
                setPopupMessage("Delivery details saved securely!");
                setIsError(false);
                setShowPopup(true);
                setTimeout(() => {
                    setShowPopup(false);
                }, 3000);
            } else {
                throw new Error(responseData.message || 'Submission failed');
            }
        } catch (error) {
            console.error("Delivery submission error:", error);
            setPopupMessage(error.message);
            setIsError(true);
            setShowPopup(true);
            setTimeout(() => setShowPopup(false), 3000);
        } finally {
            setLoading(false);
        }
    };

    function resetHandler() {
        setDeliveryData({ name: "", contact: "", streetAdd: "", city: "", pin: "", district: "" });
    }

    return (
        <motion.div 
            className="delivery-wrapper"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6 }}
        >
            <div className="delivery-hero">
                <motion.div 
                    className="delivery-hero-content"
                    initial={{ y: 30, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.2, duration: 0.6 }}
                >
                    <h1 className="hero-title">Setup <span className="highlight">Delivery</span></h1>
                    <p className="hero-subtitle">Tell us where to bring your premium frozen treats for a seamless experience.</p>
                </motion.div>
            </div>

            <motion.div 
                className="form-container-premium"
                initial={{ y: 50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4, duration: 0.6 }}
            >
                <form onSubmit={handleSubmit} className="premium-form">
                    <h2 className="form-heading"><FaTruck className="heading-icon" /> Delivery Details</h2>
                    
                    <div className="form-grid">
                        <div className="form-group-premium">
                            <label><FaUserAlt className="input-icon" /> Full Name</label>
                            <input
                                type="text"
                                placeholder="Receiver's name"
                                name="name"
                                value={deliveryData.name}
                                onChange={changeHandler}
                                required
                                disabled={loading}
                            />
                        </div>

                        <div className="form-group-premium">
                            <label><FaPhoneAlt className="input-icon" /> Contact Number</label>
                            <input
                                type="tel"
                                placeholder="10-digit number"
                                name="contact"
                                value={deliveryData.contact}
                                onChange={changeHandler}
                                pattern="[0-9]{10}"
                                title="Enter a valid 10-digit phone number"
                                required
                                disabled={loading}
                            />
                        </div>

                        <div className="form-group-premium full-width">
                            <label><FaMapMarkerAlt className="input-icon" /> Street/House Address</label>
                            <input
                                type="text"
                                placeholder="House no, Building, Street, Area"
                                name="streetAdd"
                                value={deliveryData.streetAdd}
                                onChange={changeHandler}
                                required
                                disabled={loading}
                            />
                        </div>

                        <div className="form-group-premium">
                            <label><FaCity className="input-icon" /> City</label>
                            <input
                                type="text"
                                placeholder="City"
                                name="city"
                                value={deliveryData.city}
                                onChange={changeHandler}
                                required
                                disabled={loading}
                            />
                        </div>
                        
                        <div className="form-group-premium">
                            <label><FaMapPin className="input-icon" /> PIN Code</label>
                            <input
                                type="text"
                                placeholder="6-digit PIN"
                                name="pin"
                                value={deliveryData.pin}
                                onChange={changeHandler}
                                pattern="[0-9]{6}"
                                title="Enter a valid 6-digit PIN code"
                                required
                                disabled={loading}
                            />
                        </div>

                        <div className="form-group-premium full-width">
                            <label>District</label>
                            <select
                                name="district"
                                value={deliveryData.district}
                                onChange={changeHandler}
                                required
                                disabled={loading}
                            >
                                <option value="" disabled>-- Select your region --</option>
                                {["Ahmednagar", "Amravati", "Beed", "Bhandara", "Chandrapur", "Dhule", "Gadchiroli", "Hingoli", "Kolhapur", "Mumbai", "Pune"].map(d => (
                                    <option key={d} value={d}>{d}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="button-group-premium">
                        <motion.button
                            type="button"
                            className="clear-btn-premium"
                            onClick={resetHandler}
                            disabled={loading}
                            whileHover={{ backgroundColor: "rgba(255,255,255,0.1)" }}
                            whileTap={{ scale: 0.95 }}
                        >
                            Reset
                        </motion.button>
                        <motion.button
                            type="submit"
                            className="submit-btn-premium"
                            disabled={loading}
                            whileHover={{ scale: 1.05, boxShadow: "0 10px 20px rgba(224, 64, 251, 0.4)" }}
                            whileTap={{ scale: 0.95 }}
                        >
                            {loading ? <div className="loader"></div> : "Save Delivery Info"}
                        </motion.button>
                    </div>
                </form>
            </motion.div>

            <AnimatePresence>
                {showPopup && (
                    <motion.div 
                        className={`popup-premium ${isError ? 'error-popup' : 'success-popup'}`}
                        initial={{ opacity: 0, y: -50, x: '-50%' }}
                        animate={{ opacity: 1, y: 20, x: '-50%' }}
                        exit={{ opacity: 0, y: -50, x: '-50%' }}
                    >
                        {isError ? <FaExclamationCircle className="popup-icon" /> : <FaCheckCircle className="popup-icon" />}
                        <div>
                            <h4>{isError ? "Notice" : "Success"}</h4>
                            <p>{popupMessage}</p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}

export default Delivery;