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
import AddProduct from "./Components/AddProducts";
import Footer from "./Components/Footer";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./Components/ProtectedRoute";
import AdminRoute from "./Components/AdminRoute";

function App() {
  const [cartItems, setCartItems] = useState([]);
  const navigate = useNavigate();
  const location = useLocation();

  const totalItems = cartItems.reduce((sum, item) => sum + (item.quantity || 1), 0);
  const nonCartShoppingRoutes = ['/', '/products', '/delivery', '/dinein', '/catering', '/profile'];
  const showFloatingCart = nonCartShoppingRoutes.includes(location.pathname);

  return (
    <AuthProvider>
      <div className="App">
      <div className="app-layout">
        <Navbar />
        <main className="app-main">
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Home />} />
            <Route path="/products" element={<Products cartItems={cartItems} setCartItems={setCartItems} />} />
            <Route path="/dinein" element={<DineIn />} />
            <Route path="/catering" element={<Catering />} />
            <Route path="/login" element={<LoginCard />} />
            <Route path="/signup" element={<SignUpCard />} />

            {/* Protected Authenticated User Routes */}
            <Route path="/delivery" element={
              <ProtectedRoute>
                <Delivery />
              </ProtectedRoute>
            } />
            <Route path="/cart" element={
              <ProtectedRoute>
                <Cart addedProducts={cartItems} setCartItems={setCartItems} />
              </ProtectedRoute>
            } />
            <Route path="/checkout" element={
              <ProtectedRoute>
                <Checkout cartItems={cartItems} setCartItems={setCartItems} />
              </ProtectedRoute>
            } />
            <Route path="/order-confirmation/:orderId" element={
              <ProtectedRoute>
                <OrderConfirmation />
              </ProtectedRoute>
            } />
            <Route path="/profile" element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            } />

            {/* Admin Only Routes */}
            <Route path="/add-product" element={
              <AdminRoute>
                <AddProduct />
              </AdminRoute>
            } />
          </Routes>
        </main>
        <Footer />
      </div>

      {/* Floating Cart Button */}
      <AnimatePresence>
        {showFloatingCart && (
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
    </AuthProvider>
  );
}

export default App;

