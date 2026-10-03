import logo from '../assets/logo.png';
import { IoPerson } from "react-icons/io5";
import { FaShoppingCart, FaBars, FaTimes } from "react-icons/fa";
import './Navbar.css';
import { NavLink, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';

function Navbar() {
    const { user } = useAuth();
    const location = useLocation();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 40);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const navLinks = [
        { path: '/', label: 'Home' },
        { path: '/products', label: 'Products' },
        { path: '/delivery', label: 'Delivery' },
        { path: '/dinein', label: 'Dine-In' },
        { path: '/catering', label: 'Catering' },
    ];

    const shoppingRoutes = [
        '/',
        '/products',
        '/delivery',
        '/dinein',
        '/catering',
        '/cart',
        '/checkout',
        '/profile'
    ];

    const showCart = shoppingRoutes.includes(location.pathname) || location.pathname.startsWith('/order-confirmation');

    return (
        <header className={`navbar-header ${scrolled ? 'navbar-header--scrolled' : ''}`}>
            <nav className="navbar">
                <div className="logo-section">
                    <NavLink to="/" className="logo-link">
                        <img src={logo} alt="FrozenFeast Logo" />
                        <p>Frozen<span className="logo-accent">Feast</span></p>
                    </NavLink>
                </div>

                <div className="menu-section">
                    {navLinks.map((link) => (
                        <NavLink
                            key={link.path}
                            to={link.path}
                            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                        >
                            {link.label}
                        </NavLink>
                    ))}
                    {user && user.role === 'Admin' && (
                        <NavLink
                            to="/add-product"
                            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                        >
                            + Add Product
                        </NavLink>
                    )}
                </div>

                <div className="icons-section">
                    {user ? (
                        <NavLink to="/profile" aria-label="Profile">
                            <button className="icon-btn" aria-label="User profile">
                                <IoPerson />
                            </button>
                        </NavLink>
                    ) : (
                        <NavLink to="/login" aria-label="Login">
                            <button className="icon-btn" aria-label="Login">
                                <IoPerson />
                            </button>
                        </NavLink>
                    )}
                    {showCart && (
                        <NavLink to="/cart" aria-label="Shopping Cart" className="cart-link-desktop">
                            <button className="icon-btn" aria-label="View cart">
                                <FaShoppingCart />
                            </button>
                        </NavLink>
                    )}

                    <button
                        className="hamburger-btn"
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                        aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
                        aria-expanded={isMobileMenuOpen}
                    >
                        {isMobileMenuOpen ? <FaTimes /> : <FaBars />}
                    </button>
                </div>
            </nav>

            {/* Mobile overlay */}
            <AnimatePresence>
                {isMobileMenuOpen && (
                    <motion.div
                        className="mobile-overlay"
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.3, ease: "easeOut" }}
                    >
                        {navLinks.map((link, i) => (
                            <motion.div
                                key={link.path}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.06, duration: 0.3 }}
                            >
                                <NavLink
                                    to={link.path}
                                    className={({ isActive }) => `mobile-nav-item ${isActive ? 'active' : ''}`}
                                    onClick={() => setIsMobileMenuOpen(false)}
                                >
                                    {link.label}
                                </NavLink>
                            </motion.div>
                        ))}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.35 }}
                        >
                            <NavLink
                                to="/products"
                                className="mobile-cta"
                                onClick={() => setIsMobileMenuOpen(false)}
                            >
                                Order Now
                            </NavLink>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </header>
    );
}

export default Navbar;