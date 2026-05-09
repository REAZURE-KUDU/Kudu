// Checkout.js
import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth0 } from "@auth0/auth0-react";
import "./Checkout.css";

const CheckoutPage = () => {
  const { getAccessTokenSilently } = useAuth0();
  const [cartItems, setCartItems] = useState([]);
  const [cartTotal, setCartTotal] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const savedCart = localStorage.getItem("cart");
    if (!savedCart || JSON.parse(savedCart).length === 0) {
      navigate("/cart");
      return;
    }
    const parsed = JSON.parse(savedCart);
    setCartItems(parsed);
    calculateTotal(parsed);
  }, [navigate]);

  const calculateTotal = (items) => {
    const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    setCartTotal(total);
  };

  const getCartByVendor = () => {
    const grouped = {};
    cartItems.forEach((item) => {
      if (!grouped[item.vendorId]) {
        grouped[item.vendorId] = {
          vendorId: item.vendorId,
          vendorName: item.vendorName,
          items: [],
          subtotal: 0,
        };
      }
      grouped[item.vendorId].items.push(item);
      grouped[item.vendorId].subtotal += item.price * item.quantity;
    });
    return Object.values(grouped);
  };

  const hasMultipleVendors = getCartByVendor().length > 1;

  const handlePlaceOrder = async () => {
    setIsProcessing(true);
    setError("");

    try {
      const token = await getAccessTokenSilently({
        authorizationParams: { audience: process.env.REACT_APP_AUTH0_AUDIENCE },
      });

      const cartByVendor = getCartByVendor();
      const firstVendor = cartByVendor[0];

      const orderData = {
        vendorId: firstVendor.vendorId,
        items: firstVendor.items.map((item) => ({
          itemId: item.itemId,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          subtotal: item.price * item.quantity,
        })),
        totalAmount: firstVendor.subtotal,
      };

      const response = await fetch("/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(orderData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to place order");
      }

      const data = await response.json();
      const { order } = data;

      localStorage.removeItem("cart");
      navigate(`/payment/${order._id}`);

    } catch (err) {
      setError(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const cartByVendor = getCartByVendor();
  const itemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <main className="kd-app">
      {/* SIDEBAR */}
      <aside
        className={`kd-sidebar ${expanded ? "expanded" : ""}`}
        onMouseEnter={() => setExpanded(true)}
        onMouseLeave={() => setExpanded(false)}
      >
        <header className="kd-logo">
          {expanded ? "KuduDash" : "KD"}
        </header>

        <nav className="kd-nav">
          <button className="kd-nav-item">
            <svg viewBox="0 0 24 24" className="kd-icon">
              <rect x="3" y="3" width="7" height="7" rx="2" />
              <rect x="14" y="3" width="7" height="7" rx="2" />
              <rect x="14" y="14" width="7" height="7" rx="2" />
              <rect x="3" y="14" width="7" height="7" rx="2" />
            </svg>
            {expanded && <p className="kd-nav-text">Overview</p>}
          </button>

          <button className="kd-nav-item">
            <svg viewBox="0 0 24 24" className="kd-icon">
              <path d="M4 6h16M4 12h16M4 18h16" />
            </svg>
            {expanded && <p className="kd-nav-text">Vendors</p>}
          </button>

          <button className="kd-nav-item">
            <svg viewBox="0 0 24 24" className="kd-icon">
              <path d="M6 2h12v20H6zM6 6h12" />
            </svg>
            {expanded && <p className="kd-nav-text">Cart</p>}
          </button>

          <button className="kd-nav-item active">
            <svg viewBox="0 0 24 24" className="kd-icon">
              <path d="M12 2a10 10 0 100 20 10 10 0 000-20z" />
              <path d="M12 8v4l3 3" />
            </svg>
            {expanded && <p className="kd-nav-text">Checkout</p>}
          </button>

          <button className="kd-nav-item">
            <svg viewBox="0 0 24 24" className="kd-icon">
              <path d="M12 2a10 10 0 100 20 10 10 0 000-20z" />
            </svg>
            {expanded && <p className="kd-nav-text">About</p>}
          </button>

          <button className="kd-nav-item">
            <svg viewBox="0 0 24 24" className="kd-icon">
              <path d="M12 4v16M4 12h16" />
            </svg>
            {expanded && <p className="kd-nav-text">Help</p>}
          </button>

          <button className="kd-nav-item">
            <svg viewBox="0 0 24 24" className="kd-icon">
              <path d="M12 8a4 4 0 100 8 4 4 0 000-8zm8 4a8 8 0 11-16 0 8 8 0 0116 0z" />
            </svg>
            {expanded && <p className="kd-nav-text">Settings</p>}
          </button>
        </nav>
      </aside>

      {/* MAIN CONTENT */}
      <section className="kd-main">
        <header className="kd-topbar">
          <section>
            <h1 className="kd-page-title" style={{ fontFamily: "'Baloo 2', sans-serif" }}>
              Checkout
            </h1>
            <p className="kd-page-sub">
              Review your order before placing
            </p>
          </section>
          <figure className="kd-avatar" style={{ fontFamily: "'Baloo 2', sans-serif" }}>
            KD
          </figure>
        </header>

        {hasMultipleVendors && (
          <aside className="kd-multi-vendor-warning">
            <span className="kd-warning-icon">⚠️</span>
            <span className="kd-warning-text">
              Your cart contains items from multiple vendors. They will be processed as separate orders.
            </span>
          </aside>
        )}

        <section className="kd-checkout-grid">
          {/* LEFT COLUMN - ORDER SUMMARY */}
          <section className="kd-order-summary">
            <h2 className="kd-summary-title">Order Summary</h2>

            {cartByVendor.map((vendorCart) => (
              <article key={vendorCart.vendorId} className="kd-vendor-checkout-section">
                <h3 className="kd-vendor-checkout-name">{vendorCart.vendorName}</h3>

                {vendorCart.items.map((item) => (
                  <section key={item.itemId} className="kd-checkout-item">
                    <p className="kd-checkout-item-name">
                      <span className="kd-checkout-item-quantity">{item.quantity}×</span>
                      <span>{item.name}</span>
                    </p>
                    <output>R{(item.price * item.quantity).toFixed(2)}</output>
                  </section>
                ))}

                <footer className="kd-vendor-checkout-subtotal">
                  <span>Subtotal</span>
                  <span>R{vendorCart.subtotal.toFixed(2)}</span>
                </footer>
              </article>
            ))}
          </section>

          {/* RIGHT COLUMN - PAYMENT SUMMARY */}
          <aside className="kd-payment-panel">
            <h2 className="kd-payment-title">Payment Summary</h2>

            <section className="kd-payment-row">
              <span>Subtotal ({itemCount} {itemCount === 1 ? "item" : "items"})</span>
              <span>R{cartTotal.toFixed(2)}</span>
            </section>

            <section className="kd-payment-row">
              <span>Delivery Fee</span>
              <span>R0.00</span>
            </section>

            <section className="kd-payment-row">
              <span>Service Fee</span>
              <span>R0.00</span>
            </section>

            <footer className="kd-payment-row total">
              <span>Total</span>
              <span>R{cartTotal.toFixed(2)}</span>
            </footer>

            {error && (
              <aside className="kd-error-message">
                {error}
              </aside>
            )}

            <button
              className="kd-place-order-btn"
              onClick={handlePlaceOrder}
              disabled={isProcessing}
            >
              {isProcessing ? "Processing..." : "Place Order →"}
            </button>

            <Link to="/cart" className="kd-back-to-cart">
              ← Back to Cart
            </Link>
          </aside>
        </section>
      </section>
    </main>
  );
};

export default CheckoutPage;