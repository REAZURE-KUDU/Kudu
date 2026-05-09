// App.js
import React from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import Login from "./Login";
import Vibe from "./Vibe";
import Student from "./Dashboards/Student";
import Vendor from "./Dashboards/Vendor";
import Admin from "./Dashboards/Admin";
import PaymentPage from "./payment/Payment";
import { CartProvider } from "./Cart/CartContext";
import Callback from "./Callback";

function App() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<Login />} />
        <Route path="/vibe" element={<Vibe />} />
        <Route path="/callback" element={<Callback />} />
        <Route path="/dashboard/vendor" element={<Vendor />} />
        <Route path="/dashboard/admin" element={<Admin />} />
        <Route path="/dashboard/student" element={
          <CartProvider><Student /></CartProvider>
        } />
        <Route path="/payment/:orderId" element={
          <CartProvider><PaymentPage /></CartProvider>
        } />
        <Route path="/payment/result/:orderId" element={
          <CartProvider><PaymentPage showResult /></CartProvider>
        } />
      </Routes>
    </AnimatePresence>
  );
}

export default App;
