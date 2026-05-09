// Student.js
import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useCart } from "../Cart/CartContext";
import { useAuth0 } from "@auth0/auth0-react";
import "./Student.css";
import ProfilePanel from "./ProfilePanel";
import OrderTracking from "./OrderTracking";
import ReviewForm from "../ReviewForm";

const CATEGORIES = ["Food", "Drink", "Snack", "Dessert", "Other"];

const navItems = [
  {
    id: "overview", label: "Overview",
    path: [
      React.createElement("rect", { key: "a", x: "3",  y: "3",  width: "7", height: "7", rx: "2" }),
      React.createElement("rect", { key: "b", x: "14", y: "3",  width: "7", height: "7", rx: "2" }),
      React.createElement("rect", { key: "c", x: "14", y: "14", width: "7", height: "7", rx: "2" }),
      React.createElement("rect", { key: "d", x: "3",  y: "14", width: "7", height: "7", rx: "2" }),
    ],
  },
  {
    id: "vendors", label: "Vendors",
    path: [React.createElement("path", { key: "a", d: "M4 6h16M4 12h16M4 18h16" })],
  },
  {
    id: "orders", label: "Orders",
    path: [React.createElement("path", { key: "a", d: "M6 2h12v20H6zM6 6h12" })],
  },
  {
    id: "about", label: "About",
    path: [React.createElement("path", { key: "a", d: "M12 2a10 10 0 100 20 10 10 0 000-20z" })],
  },
  {
    id: "settings", label: "Settings",
    path: [React.createElement("path", { key: "a", d: "M12 8a4 4 0 100 8 4 4 0 000-8zm8 4a8 8 0 11-16 0 8 8 0 0116 0z" })],
  },
];

const Student = () => {
  const {
    cartItems, cartTotal, cartCount,
    addToCart, removeFromCart, updateQuantity, clearCart, getCartByVendor,
  } = useCart();
  const { getAccessTokenSilently, user: auth0User } = useAuth0();

  const [searchParams] = useSearchParams();
  const [expanded, setExpanded] = useState(false);
  const [activeNav, setActiveNav] = useState(searchParams.get("tab") || "vendors");
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [vendors, setVendors] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [loadingVendors, setLoadingVendors] = useState(true);
  const [loadingMenu, setLoadingMenu] = useState(false);
  const [error, setError] = useState(null);
  const [activeCategory, setActiveCategory] = useState("All");
  const [studentProfile, setStudentProfile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");
  const [orderSuccess, setOrderSuccess] = useState(null);

  useEffect(() => {
    if (!auth0User?.sub) return;
    getAccessTokenSilently({
      authorizationParams: { audience: process.env.REACT_APP_AUTH0_AUDIENCE },
    })
      .then((token) =>
        fetch(`/api/students/${auth0User.sub}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
      )
      .then((res) => res.ok ? res.json() : null)
      .then((data) => { if (data) setStudentProfile(data); })
      .catch(console.error);
  }, [auth0User, getAccessTokenSilently]);

  useEffect(() => {
    fetch("/api/vendors")
      .then((res) => { if (!res.ok) throw new Error("Failed to fetch vendors"); return res.json(); })
      .then((data) => { setVendors(data); setLoadingVendors(false); })
      .catch((err) => { setError(err.message); setLoadingVendors(false); });
  }, []);

  useEffect(() => {
    if (!selectedVendor) return;
    setLoadingMenu(true);
    setMenuItems([]);
    fetch(`/api/menu?vendor=${selectedVendor._id}`)
      .then((res) => { if (!res.ok) throw new Error("Failed to fetch menu"); return res.json(); })
      .then((data) => { setMenuItems(data); setLoadingMenu(false); })
      .catch((err) => { setError(err.message); setLoadingMenu(false); });
  }, [selectedVendor]);

  const filteredItems =
    activeCategory === "All" ? menuItems : menuItems.filter((i) => i.category === activeCategory);

  const handleAddToCart = (item) => {
    if (!selectedVendor) return;
    addToCart(item, selectedVendor._id, selectedVendor.businessName);
  };

  const handlePlaceOrder = async () => {
    setIsProcessing(true);
    setCheckoutError("");
    try {
      const token = await getAccessTokenSilently({
        authorizationParams: { audience: process.env.REACT_APP_AUTH0_AUDIENCE },
      });
      const cartByVendor = getCartByVendor();
      const orderPromises = cartByVendor.map((vendorCart) => {
        const orderData = {
          vendorId: vendorCart.vendorId,
          items: vendorCart.items.map((item) => ({
            menuItem: item.menuItem,
            name:     item.name,
            price:    item.price,
            quantity: item.quantity,
            subtotal: item.price * item.quantity,
          })),
          totalAmount: vendorCart.subtotal,
        };
        return fetch("/api/orders", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify(orderData),
        }).then((res) => {
          if (!res.ok) return res.json().then((e) => { throw new Error(e.message || "Failed to place order"); });
          return res.json();
        });
      });
      const results = await Promise.all(orderPromises);
      await clearCart();
      setOrderSuccess(results.map((r) => r.order));
      setActiveNav("orders");
    } catch (err) {
      setCheckoutError(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const cartByVendor = getCartByVendor();
  const itemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  return (
    React.createElement("main", { className: "kd-app" },

      React.createElement("aside", {
        className: `kd-sidebar ${expanded ? "expanded" : ""}`,
        onMouseEnter: () => setExpanded(true),
        onMouseLeave: () => setExpanded(false),
      },
        React.createElement("header", { className: "kd-logo" }, expanded ? "KuduDash" : "KD"),
        React.createElement("nav", { className: "kd-nav" },

          navItems.map(({ id, label, path }) =>
            React.createElement("button", {
              key: id,
              className: `kd-nav-item ${activeNav === id ? "active" : ""}`,
              onClick: () => setActiveNav(id),
            },
              React.createElement("svg", { viewBox: "0 0 24 24", className: "kd-icon" }, ...path),
              expanded && React.createElement("p", { className: "kd-nav-text" }, label)
            )
          ),

          React.createElement("button", {
            className: `kd-nav-item ${activeNav === "cart" ? "active" : ""}`,
            onClick: () => setActiveNav("cart"),
            style: { position: "relative" },
          },
            React.createElement("svg", { viewBox: "0 0 24 24", className: "kd-icon" },
              React.createElement("path", { d: "M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" }),
              React.createElement("path", { d: "M3 6h18" }),
              React.createElement("path", { d: "M16 10a4 4 0 01-8 0" })
            ),
            cartCount > 0 && React.createElement("span", {
              style: {
                position: "absolute", top: "6px", right: expanded ? "12px" : "6px",
                background: "#ef4444", color: "#fff", borderRadius: "999px",
                fontSize: "10px", fontWeight: "700", minWidth: "18px", height: "18px",
                display: "flex", alignItems: "center", justifyContent: "center", padding: "0 4px",
              },
            }, cartCount),
            expanded && React.createElement("p", { className: "kd-nav-text" }, "Cart")
          )
        )
      ),

      React.createElement("section", { className: "kd-main" },

        React.createElement("header", { className: "kd-topbar" },
          React.createElement("section", null,
            React.createElement("h1", { className: "kd-page-title", style: { fontFamily: "'Baloo 2', sans-serif" } },
              activeNav === "vendors"  && (selectedVendor ? selectedVendor.businessName : "Vendors"),
              activeNav === "cart"     && "Cart & Checkout",
              activeNav === "orders"   && "My Orders",
              activeNav === "overview" && "Overview",
              activeNav === "about"    && "About",
              activeNav === "settings" && "Settings"
            ),
            React.createElement("p", { className: "kd-page-sub" },
              activeNav === "vendors"  && (selectedVendor ? "Browse items" : "Choose where to order from"),
              activeNav === "cart"     && "Review your order and place it",
              activeNav === "orders"   && "Track your orders in real time",
              activeNav === "overview" && "Welcome to KuduDash"
            )
          ),
          React.createElement(ProfilePanel, { role: "student", user: studentProfile })
        ),

        // ── Vendors page ──────────────────────────────────────────────
        activeNav === "vendors" && (
          !selectedVendor
            ? React.createElement("section", { className: "kd-grid" },
                loadingVendors
                  ? React.createElement("p", { className: "kd-state-msg" }, "Loading vendors...")
                  : error
                  ? React.createElement("p", { className: "kd-state-msg kd-error" }, error)
                  : vendors.length === 0
                  ? React.createElement("p", { className: "kd-state-msg" }, "No vendors available.")
                  : vendors.map((vendor) =>
                      React.createElement("article", {
                        key: vendor._id,
                        className: "kd-vendor-card",
                        onClick: () => setSelectedVendor(vendor),
                      },
                        React.createElement("header", null,
                          React.createElement("figure", null,
                            vendor.logo
                              ? React.createElement("img", { src: vendor.logo, alt: vendor.businessName, className: "kd-vendor-logo" })
                              : React.createElement("abbr", { title: vendor.businessName }, vendor.businessName[0])
                          ),
                          React.createElement("hgroup", null,
                            React.createElement("h2", null, vendor.businessName),
                            React.createElement("p", null, React.createElement("small", null, vendor.location))
                          )
                        ),
                        React.createElement("p", null, vendor.description)
                      )
                    )
              )
            : React.createElement("section", { className: "kd-menu-view" },
                React.createElement("button", {
                  className: "kd-back-btn",
                  onClick: () => { setSelectedVendor(null); setMenuItems([]); setActiveCategory("All"); },
                }, "← Back"),

                React.createElement("nav", { className: "kd-category-bar", "aria-label": "Filter by category" },
                  ["All", ...CATEGORIES].map((cat) => {
                    const count = cat === "All" ? menuItems.length : menuItems.filter((i) => i.category === cat).length;
                    return React.createElement("button", {
                      key: cat,
                      className: `kd-category-chip ${activeCategory === cat ? "active" : ""}`,
                      onClick: () => setActiveCategory(cat),
                      "aria-pressed": activeCategory === cat,
                    },
                      cat,
                      React.createElement("span", { className: "kd-category-count" }, count)
                    );
                  })
                ),

                loadingMenu && React.createElement("p", { className: "kd-state-msg" }, "Loading menu..."),

                React.createElement("section", { className: "kd-menu-grid", "aria-label": "Menu items" },
                  !loadingMenu && filteredItems.length === 0
                    ? React.createElement("p", { className: "kd-state-msg" }, "No items in this category.")
                    : filteredItems.map((item) =>
                        React.createElement("article", { key: item._id, className: "kd-menu-card" },
                          React.createElement("figure", null,
                            item.imageUrl && React.createElement("img", {
                              src: item.imageUrl, alt: item.name, className: "kd-menu-image", loading: "lazy",
                            })
                          ),
                          React.createElement("section", null,
                            React.createElement("h2", null, item.name),
                            React.createElement("p", null, item.description),
                            item.category && React.createElement("p", null, React.createElement("small", null, item.category))
                          ),
                          React.createElement("footer", null,
                            React.createElement("data", { value: item.price }, `R${Number(item.price).toFixed(2)}`),
                            React.createElement("button", {
                              className: "kd-btn",
                              onClick: () => handleAddToCart(item),
                              disabled: item.soldOut,
                            }, item.soldOut ? "Sold Out" : "+ Add")
                          )
                        )
                      )
                )
              )
        ),

        // ── Cart page ──────────────────────────────────────────────────
        activeNav === "cart" && React.createElement("section", { className: "kd-checkout-view" },
          cartItems.length === 0
            ? React.createElement("div", { className: "kd-empty-state", role: "status" },
                React.createElement("svg", { className: "kd-empty-icon", viewBox: "0 0 24 24", "aria-hidden": "true" },
                  React.createElement("path", { d: "M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" }),
                  React.createElement("path", { d: "M3 6h18" }),
                  React.createElement("path", { d: "M16 10a4 4 0 01-8 0" })
                ),
                React.createElement("p", null, "Your cart is empty."),
                React.createElement("button", {
                  className: "kd-btn primary",
                  onClick: () => setActiveNav("vendors"),
                }, "Browse Vendors")
              )
            : React.createElement("section", { className: "kd-checkout-grid" },

                React.createElement("section", { className: "kd-order-summary" },
                  React.createElement("h2", { className: "kd-summary-title" }, "Order Summary"),
                  cartByVendor.map((vendorCart) =>
                    React.createElement("article", { key: vendorCart.vendorId, className: "kd-vendor-checkout-section" },
                      React.createElement("h3", { className: "kd-vendor-checkout-name" }, vendorCart.vendorName),
                      vendorCart.items.map((item) =>
                        React.createElement("section", { key: item._id, className: "kd-checkout-item" },
                          React.createElement("p", { className: "kd-checkout-item-name" },
                            React.createElement("span", { className: "kd-checkout-item-quantity" }, `${item.quantity}×`),
                            React.createElement("span", null, item.name)
                          ),
                          React.createElement("section", { className: "kd-checkout-item-controls" },
                            React.createElement("button", { className: "kd-qty-btn", onClick: () => updateQuantity(item._id, item.quantity - 1) }, "−"),
                            React.createElement("span", null, item.quantity),
                            React.createElement("button", { className: "kd-qty-btn", onClick: () => updateQuantity(item._id, item.quantity + 1) }, "+"),
                            React.createElement("button", { className: "kd-remove-btn", onClick: () => removeFromCart(item._id) }, "🗑"),
                            React.createElement("span", null, `R${(item.price * item.quantity).toFixed(2)}`)
                          )
                        )
                      ),
                      React.createElement("footer", { className: "kd-vendor-checkout-subtotal" },
                        React.createElement("span", null, "Subtotal"),
                        React.createElement("span", null, `R${vendorCart.subtotal.toFixed(2)}`)
                      )
                    )
                  ),
                  React.createElement("button", {
                    className: "kd-btn danger",
                    style: { marginTop: "16px" },
                    onClick: clearCart,
                  }, "Clear Cart")
                ),

                React.createElement("aside", { className: "kd-payment-panel" },
                  React.createElement("h2", { className: "kd-payment-title" }, "Payment Summary"),
                  React.createElement("section", { className: "kd-payment-row" },
                    React.createElement("span", null, `Subtotal (${itemCount} ${itemCount === 1 ? "item" : "items"})`),
                    React.createElement("span", null, `R${cartTotal.toFixed(2)}`)
                  ),
                  React.createElement("section", { className: "kd-payment-row" },
                    React.createElement("span", null, "Delivery Fee"),
                    React.createElement("span", null, "R0.00")
                  ),
                  React.createElement("section", { className: "kd-payment-row" },
                    React.createElement("span", null, "Service Fee"),
                    React.createElement("span", null, "R0.00")
                  ),
                  React.createElement("footer", { className: "kd-payment-row total" },
                    React.createElement("span", null, "Total"),
                    React.createElement("span", null, `R${cartTotal.toFixed(2)}`)
                  ),
                  cartByVendor.length > 1 && React.createElement("aside", { className: "kd-info-message" },
                    `🛒 You have items from ${cartByVendor.length} vendors — a separate order will be placed for each.`
                  ),
                  checkoutError && React.createElement("aside", { className: "kd-error-message" }, checkoutError),
                  React.createElement("button", {
                    className: "kd-place-order-btn",
                    onClick: handlePlaceOrder,
                    disabled: isProcessing,
                  }, isProcessing ? "Processing..." : `Place ${cartByVendor.length > 1 ? `${cartByVendor.length} Orders` : "Order"} →`),
                  React.createElement("button", {
                    className: "kd-btn ghost",
                    style: { width: "100%", marginTop: "8px" },
                    onClick: () => setActiveNav("vendors"),
                  }, "← Continue Shopping")
                )
              )
        ),

        // ── Orders page — now uses OrderTracking ──────────────────────
        activeNav === "orders" && React.createElement(OrderTracking, {
          successOrders: orderSuccess,
          ReviewFormComponent: ReviewForm,   // pass it down as a prop
        }),

        // ── Other pages ───────────────────────────────────────────────
        (activeNav === "overview" || activeNav === "about" || activeNav === "settings") &&
          React.createElement("section", null,
            React.createElement("p", { style: { color: "#475569", fontSize: "14px" } },
              "The ", React.createElement("strong", null, activeNav), " section is not yet implemented."
            )
          )
      )
    )
  );
};

export default Student;