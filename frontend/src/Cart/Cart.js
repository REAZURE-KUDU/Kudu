// Cart.js
import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./Cart.css";

const CartPage = () => {
  const [cartItems, setCartItems] = useState([]);
  const [cartTotal, setCartTotal] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const navigate = useNavigate();

  // Load cart from localStorage on mount
  useEffect(() => {
    const savedCart = localStorage.getItem("cart");
    if (savedCart) {
      const parsed = JSON.parse(savedCart);
      setCartItems(parsed);
      calculateTotal(parsed);
    }
  }, []);

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem("cart", JSON.stringify(cartItems));
    calculateTotal(cartItems);
  }, [cartItems]);

  const calculateTotal = (items) => {
    const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    setCartTotal(total);
  };

  // Group cart items by vendor
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

  const updateQuantity = (itemId, newQuantity) => {
    if (newQuantity <= 0) {
      removeFromCart(itemId);
      return;
    }
    setCartItems((prevItems) =>
      prevItems.map((item) =>
        item.itemId === itemId ? { ...item, quantity: newQuantity } : item
      )
    );
  };

  const removeFromCart = (itemId) => {
    setCartItems((prevItems) => prevItems.filter((item) => item.itemId !== itemId));
  };

  const clearCart = () => {
    if (window.confirm("Are you sure you want to clear your entire cart?")) {
      setCartItems([]);
    }
  };

  const handleCheckout = () => {
    if (cartItems.length === 0) {
      alert("Your cart is empty");
      return;
    }
    navigate("/checkout");
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

          <button className="kd-nav-item active">
            <svg viewBox="0 0 24 24" className="kd-icon">
              <path d="M6 2h12v20H6zM6 6h12" />
            </svg>
            {expanded && <p className="kd-nav-text">Cart</p>}
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
              Your Cart
            </h1>
            <p className="kd-page-sub">
              {itemCount} {itemCount === 1 ? "item" : "items"} • R{cartTotal.toFixed(2)}
            </p>
          </section>
          <figure className="kd-avatar" style={{ fontFamily: "'Baloo 2', sans-serif" }}>
            KD
          </figure>
        </header>

        {cartItems.length === 0 ? (
          /* EMPTY CART STATE */
          <section className="kd-empty-cart">
            <figure className="kd-empty-cart-icon">🛒</figure>
            <p className="kd-empty-cart-message">Your cart is empty</p>
            <Link to="/browse" className="kd-empty-cart-btn">
              Browse Menus
            </Link>
          </section>
        ) : (
          <>
            {/* CART ITEMS GROUPED BY VENDOR */}
            {cartByVendor.map((vendorCart) => (
              <article key={vendorCart.vendorId} className="kd-cart-vendor-section">
                <h2 className="kd-cart-vendor-name">{vendorCart.vendorName}</h2>

                {vendorCart.items.map((item) => (
                  <section key={item.itemId} className="kd-cart-item">
                    <figure className="kd-cart-item-info">
                      {item.imageUrl && (
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          className="kd-cart-item-image"
                        />
                      )}
                      <figcaption className="kd-cart-item-details">
                        <strong className="kd-cart-item-name">{item.name}</strong>
                        <span className="kd-cart-item-price">
                          R{item.price.toFixed(2)} each
                        </span>
                      </figcaption>
                    </figure>

                    <nav className="kd-cart-quantity">
                      <button
                        className="kd-quantity-btn"
                        onClick={() => updateQuantity(item.itemId, item.quantity - 1)}
                      >
                        −
                      </button>
                      <span className="kd-quantity-value">{item.quantity}</span>
                      <button
                        className="kd-quantity-btn"
                        onClick={() => updateQuantity(item.itemId, item.quantity + 1)}
                      >
                        +
                      </button>
                    </nav>

                    <output className="kd-cart-item-subtotal">
                      R{(item.price * item.quantity).toFixed(2)}
                    </output>

                    <button
                      className="kd-cart-remove-btn"
                      onClick={() => removeFromCart(item.itemId)}
                      title="Remove item"
                    >
                      🗑️
                    </button>
                  </section>
                ))}

                <footer className="kd-cart-vendor-subtotal">
                  <span>Subtotal:</span>
                  <span>R{vendorCart.subtotal.toFixed(2)}</span>
                </footer>
              </article>
            ))}

            {/* CART FOOTER */}
            <footer className="kd-cart-footer">
              <button className="kd-clear-cart-btn" onClick={clearCart}>
                Clear Cart
              </button>

              <section className="kd-cart-total">
                <p>
                  <span className="kd-cart-total-label">Total:</span>
                  <span className="kd-cart-total-amount">R{cartTotal.toFixed(2)}</span>
                </p>
                <button className="kd-checkout-btn" onClick={handleCheckout}>
                  Proceed to Checkout →
                </button>
              </section>
            </footer>
          </>
        )}
      </section>
    </main>
  );
};

export default CartPage;