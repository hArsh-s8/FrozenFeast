import React from "react";
import { useState } from "react";
import Navbar from "./Components/Navbar";
import './App.css';
import { Routes, Route, useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { FaShoppingCart } from "react-icons/fa";
import Home from "./pages/Home";
import Catering from "./pages/Catering";
import Delivery from "./pages/Delivery";
import DineIn from "./pages/DineIn";
import Products from "./pages/Products";
import LoginCard from "./Components/LoginCard";
import SignUpCard from "./Components/SignUpCard";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import OrderConfirmation from "./pages/OrderConfirmation";
import ProfilePage from "./Components/ProfilePage";
import Footer from "./Components/Footer";

function App() {
  const [cartItems, setCartItems] = useState([]);
  const navigate = useNavigate();
  const location = useLocation();

  const totalItems = cartItems.reduce((sum, item) => sum + (item.quantity || 1), 0);
  const isCartPage = location.pathname === '/cart' || location.pathname === '/checkout' || location.pathname.startsWith('/order-confirmation');

  return (
    <div className="App">
      <div className="app-layout">
        <Navbar />
        <main className="app-main">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/products" element={<Products cartItems={cartItems} setCartItems={setCartItems} />} />
            <Route path="/delivery" element={<Delivery />} />
            <Route path="/dinein" element={<DineIn />} />
            <Route path="/catering" element={<Catering />} />
            <Route path="/login" element={<LoginCard />} />
            <Route path="/signup" element={<SignUpCard />} />
            <Route path="/cart" element={<Cart addedProducts={cartItems} setCartItems={setCartItems} />} />
            <Route path="/checkout" element={<Checkout cartItems={cartItems} setCartItems={setCartItems} />} />
            <Route path="/order-confirmation/:orderId" element={<OrderConfirmation />} />
            <Route path="/profile" element={<ProfilePage />} />
          </Routes>
        </main>
        <Footer />
      </div>

      {/* Floating Cart Button */}
      <AnimatePresence>
        {!isCartPage && (
          <motion.button
            className="floating-cart"
            onClick={() => navigate('/cart')}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileHover={{ scale: 1.1, boxShadow: "0 8px 35px rgba(224, 64, 251, 0.5)" }}
            whileTap={{ scale: 0.9 }}
            transition={{ type: "spring", stiffness: 400, damping: 15 }}
            aria-label="View Cart"
          >
            <FaShoppingCart />
            {totalItems > 0 && (
              <motion.span
                className="floating-cart__badge"
                key={totalItems}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 500, damping: 15 }}
              >
                {totalItems}
              </motion.span>
            )}
            <span className="floating-cart__glow"></span>
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;
