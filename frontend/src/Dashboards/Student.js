// frontend/src/Dashboards/Student.js
import React, { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { useCart } from "../Cart/CartContext";
import { useAuth0 } from "@auth0/auth0-react";
import "./Student.css";
import ProfilePanel from "./ProfilePanel";
import OrderTracking from "./OrderTracking";
import ReviewForm from "../ReviewForm";
import API_BASE_URL from '../api';

const CATEGORIES = ["Food", "Drink", "Snack", "Dessert", "Other"];

const ALLERGEN_COLOURS = {
  milk:        { bg: "rgba(251,113,133,0.15)", border: "rgba(251,113,133,0.4)", text: "#fb7185" },
  eggs:        { bg: "rgba(251,113,133,0.15)", border: "rgba(251,113,133,0.4)", text: "#fb7185" },
  fish:        { bg: "rgba(168,85,247,0.15)",  border: "rgba(168,85,247,0.4)",  text: "#c084fc" },
  shellfish:   { bg: "rgba(168,85,247,0.15)",  border: "rgba(168,85,247,0.4)",  text: "#c084fc" },
  "tree nuts": { bg: "rgba(251,146,60,0.15)",  border: "rgba(251,146,60,0.4)",  text: "#fb923c" },
  peanuts:     { bg: "rgba(251,146,60,0.15)",  border: "rgba(251,146,60,0.4)",  text: "#fb923c" },
  wheat:       { bg: "rgba(250,204,21,0.15)",  border: "rgba(250,204,21,0.4)",  text: "#eab308" },
  soy:         { bg: "rgba(20,184,166,0.15)",  border: "rgba(20,184,166,0.4)",  text: "#2dd4bf" },
  sesame:      { bg: "rgba(239,68,68,0.15)",   border: "rgba(239,68,68,0.4)",   text: "#f87171" },
};

const DIETARY_COLOURS = {
  halal:        { bg: "rgba(34,197,94,0.15)",  border: "rgba(34,197,94,0.4)",  text: "#4ade80" },
  vegetarian:   { bg: "rgba(16,185,129,0.15)", border: "rgba(16,185,129,0.4)", text: "#34d399" },
  vegan:        { bg: "rgba(5,150,105,0.15)",  border: "rgba(5,150,105,0.4)",  text: "#10b981" },
  "dairy-free": { bg: "rgba(56,189,248,0.15)", border: "rgba(56,189,248,0.4)", text: "#38bdf8" },
};

const STATUS_META = {
  pending:   { label: "Pending",   bg: "rgba(251,191,36,0.15)",  border: "rgba(251,191,36,0.35)",  text: "#fbbf24" },
  received:  { label: "Received",  bg: "rgba(99,102,241,0.15)",  border: "rgba(99,102,241,0.35)",  text: "#818cf8" },
  confirmed: { label: "Confirmed", bg: "rgba(99,102,241,0.15)",  border: "rgba(99,102,241,0.35)",  text: "#818cf8" },
  preparing: { label: "Preparing", bg: "rgba(99,102,241,0.15)",  border: "rgba(99,102,241,0.35)",  text: "#818cf8" },
  ready:     { label: "Ready",     bg: "rgba(110,231,183,0.15)", border: "rgba(110,231,183,0.35)", text: "#6ee7b7" },
  collected: { label: "Collected", bg: "rgba(110,231,183,0.15)", border: "rgba(110,231,183,0.35)", text: "#6ee7b7" },
  completed: { label: "Completed", bg: "rgba(110,231,183,0.15)", border: "rgba(110,231,183,0.35)", text: "#6ee7b7" },
  cancelled: { label: "Cancelled", bg: "rgba(239,68,68,0.15)",   border: "rgba(239,68,68,0.35)",   text: "#f87171" },
};

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

// ── Overview helpers ──────────────────────────────────────────────────────────

const fmtRand = (n) => "R" + Number(n).toFixed(2);

const deriveStats = (orders) => {
  const completed  = orders.filter((o) => ["collected", "completed"].includes(o.status));
  const active     = orders.filter((o) => ["pending","received","preparing","ready"].includes(o.status));
  const totalSpend = completed.reduce((s, o) => s + (o.totalAmount || o.subtotal || 0), 0);
  const avgOrder   = completed.length ? totalSpend / completed.length : 0;
  return { totalOrders: orders.length, totalSpend, avgOrder, activeCount: active.length };
};

const deriveFavouriteVendor = (orders) => {
  const map = {};
  orders.forEach((o) => {
    const id   = o.vendor?._id || o.vendor;
    const name = o.vendor?.businessName || "Unknown Vendor";
    if (!id) return;
    if (!map[id]) map[id] = { id, name, count: 0, spend: 0 };
    map[id].count++;
    map[id].spend += o.totalAmount || o.subtotal || 0;
  });
  return Object.values(map).sort((a, b) => b.count - a.count)[0] || null;
};

const deriveTopItems = (orders) => {
  const map = {};
  orders.forEach((o) => {
    (o.items || []).forEach((item) => {
      const key = item.name;
      if (!map[key]) map[key] = { name: key, qty: 0, spend: 0 };
      map[key].qty   += item.quantity || 1;
      map[key].spend += item.subtotal || 0;
    });
  });
  return Object.values(map).sort((a, b) => b.qty - a.qty).slice(0, 5);
};

const deriveStatusBreakdown = (orders) => {
  const counts = {};
  orders.forEach((o) => {
    const s = o.status || "pending";
    counts[s] = (counts[s] || 0) + 1;
  });
  return [
    { key: "pending",   label: "Pending",    count: counts.pending   || 0, color: "#00ffe7" },
    { key: "received",  label: "Received",   count: counts.received  || 0, color: "#ff00c8" },
    { key: "preparing", label: "Preparing",  count: counts.preparing || 0, color: "#bf5fff" },
    { key: "ready",     label: "Ready",      count: counts.ready     || 0, color: "#00e5ff" },
    { key: "collected", label: "Collected",  count: (counts.collected || 0) + (counts.completed || 0), color: "#39ff14" },
    { key: "cancelled", label: "Cancelled",  count: counts.cancelled || 0, color: "#ff3864" },
  ].filter((s) => s.count > 0);
};

const deriveRecentOrders = (orders) =>
  [...orders].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5);

// ── Order status donut chart ─────────────────────────────────────────────────

const DonutChart = ({ data, total }) => {
  if (!data || !data.length) return null;
  const SIZE   = 160;
  const STROKE = 22;
  const R      = (SIZE - STROKE) / 2;
  const CIRC   = 2 * Math.PI * R;
  const cx     = SIZE / 2;
  const cy     = SIZE / 2;

  let offset = 0;
  const slices = data.map((d) => {
    const pct   = d.count / total;
    const dash  = pct * CIRC;
    const gap   = CIRC - dash;
    const slice = { ...d, dash, gap, offset };
    offset += dash;
    return slice;
  });

  return React.createElement("div", { className: "ov-donut-wrap" },
    React.createElement("svg", {
      width: SIZE, height: SIZE,
      viewBox: `0 0 ${SIZE} ${SIZE}`,
      className: "ov-donut-svg",
    },
      React.createElement("circle", {
        cx, cy, r: R,
        fill: "none",
        stroke: "rgba(255,255,255,0.05)",
        strokeWidth: STROKE,
      }),
      slices.map((s) =>
        React.createElement("circle", {
          key: s.key,
          cx, cy, r: R,
          fill: "none",
          stroke: s.color,
          strokeWidth: STROKE,
          strokeDasharray: `${s.dash} ${s.gap}`,
          strokeDashoffset: -(s.offset - CIRC / 4),
          strokeLinecap: "butt",
          style: { transition: "stroke-dasharray 0.5s ease" },
        })
      ),
      React.createElement("text", {
        x: cx, y: cy - 8,
        textAnchor: "middle",
        fill: "#e2e8f0",
        fontSize: "22",
        fontWeight: "700",
        fontFamily: "Baloo 2, sans-serif",
      }, total),
      React.createElement("text", {
        x: cx, y: cy + 12,
        textAnchor: "middle",
        fill: "#64748b",
        fontSize: "10",
        fontFamily: "DM Sans, sans-serif",
      }, total === 1 ? "order" : "orders")
    ),
    React.createElement("div", { className: "ov-donut-legend" },
      data.map((d) =>
        React.createElement("div", { key: d.key, className: "ov-donut-legend-row" },
          React.createElement("span", {
            className: "ov-donut-dot",
            style: { background: d.color },
          }),
          React.createElement("span", { className: "ov-donut-legend-label" }, d.label),
          React.createElement("span", { className: "ov-donut-legend-count" }, d.count)
        )
      )
    )
  );
};

// ── StudentOverview ───────────────────────────────────────────────────────────

const StudentOverview = ({ studentProfile, onNavigate }) => {
  const {
    getAccessTokenSilently,
    user: auth0User,
    isAuthenticated,
    isLoading: authLoading,
  } = useAuth0();

  const [orders,  setOrders]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  const fetchOrders = useCallback(() => {
    if (!auth0User?.sub) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    // FIX: removed authorizationParams / audience override — let Auth0Provider
    // supply the audience it was initialised with (same token the rest of the
    // app uses), instead of requesting the Management API audience which returns
    // an opaque token that the backend JWT middleware rejects.
    getAccessTokenSilently()
      .then((token) =>
        fetch(`${API_BASE_URL}/api/orders`, {
          headers: { Authorization: "Bearer " + token },
        })
      )
      .then((res) => {
        if (!res.ok) throw new Error("Could not load your orders");
        return res.json();
      })
      .then((data) => {
        setOrders(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [auth0User, getAccessTokenSilently]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  if (authLoading) {
    return React.createElement("p", { className: "kd-state-msg" }, "Authenticating…");
  }

  if (!isAuthenticated) {
    return React.createElement("p", { className: "kd-state-msg kd-error" }, "Please log in to view your overview.");
  }

  if (loading) return React.createElement("p", { className: "kd-state-msg" }, "Loading your overview…");
  if (error)   return React.createElement("p", { className: "kd-state-msg kd-error" }, error);

  const stats           = deriveStats(orders);
  const favVendor       = deriveFavouriteVendor(orders);
  const topItems        = deriveTopItems(orders);
  const statusBreakdown = deriveStatusBreakdown(orders);
  const recentOrders    = deriveRecentOrders(orders);
  const firstName       = (studentProfile?.name || auth0User?.name || "Student").split(" ")[0];

  return React.createElement("div", { className: "ov-root" },

    React.createElement("div", { className: "ov-greeting" },
      React.createElement("h2", null, "Hey, " + firstName + "!"),
      React.createElement("p", null, "Here's a summary of your KuduDash activity.")
    ),

    React.createElement("div", { className: "ov-stat-grid" },

      React.createElement("div", { className: "ov-stat-card" },
        React.createElement("p", { className: "ov-stat-label" }, "Total Orders"),
        React.createElement("p", { className: "ov-stat-value" }, stats.totalOrders),
        React.createElement("p", { className: "ov-stat-sub" }, "all time")
      ),

      React.createElement("div", { className: "ov-stat-card" },
        React.createElement("p", { className: "ov-stat-label" }, "Total Spent"),
        React.createElement("p", { className: "ov-stat-value" }, fmtRand(stats.totalSpend)),
        React.createElement("p", { className: "ov-stat-sub" }, "completed orders only")
      ),

      React.createElement("div", { className: "ov-stat-card" },
        React.createElement("p", { className: "ov-stat-label" }, "Avg. Order Value"),
        React.createElement("p", { className: "ov-stat-value" }, fmtRand(stats.avgOrder)),
        React.createElement("p", { className: "ov-stat-sub" }, "per completed order")
      ),

      React.createElement("div", {
        className: "ov-stat-card" + (stats.activeCount > 0 ? " ov-stat-card--pulse" : ""),
      },
        React.createElement("p", { className: "ov-stat-label" }, "Active Orders"),
        React.createElement("p", { className: "ov-stat-value" }, stats.activeCount),
        stats.activeCount > 0
          ? React.createElement("button", {
              className: "ov-stat-link",
              onClick: () => onNavigate("orders"),
            }, "Track now \u2192")
          : React.createElement("p", { className: "ov-stat-sub" }, "none right now")
      )
    ),

    React.createElement("div", { className: "ov-mid-row" },

      React.createElement("div", { className: "ov-card" },
        React.createElement("h3", { className: "ov-card-title" }, "Favourite Vendor"),
        favVendor
          ? React.createElement("div", { className: "ov-fav-vendor" },
              React.createElement("div", { className: "ov-fav-avatar" },
                favVendor.name[0].toUpperCase()
              ),
              React.createElement("div", null,
                React.createElement("p", { className: "ov-fav-name" }, favVendor.name),
                React.createElement("p", { className: "ov-fav-meta" },
                  favVendor.count + " order" + (favVendor.count !== 1 ? "s" : "") +
                  "  \u00B7  " + fmtRand(favVendor.spend) + " spent"
                )
              )
            )
          : React.createElement("p", { className: "ov-empty-hint" }, "Place some orders to see your favourite vendor.")
      ),

      React.createElement("div", { className: "ov-card" },
        React.createElement("h3", { className: "ov-card-title" }, "Most Ordered Items"),
        topItems.length
          ? React.createElement("ol", { className: "ov-top-items" },
              topItems.map((item, i) =>
                React.createElement("li", { key: item.name, className: "ov-top-item" },
                  React.createElement("span", { className: "ov-top-rank" }, i + 1),
                  React.createElement("span", { className: "ov-top-name" }, item.name),
                  React.createElement("span", { className: "ov-top-qty" }, item.qty + "x")
                )
              )
            )
          : React.createElement("p", { className: "ov-empty-hint" }, "No items ordered yet.")
      )
    ),

    React.createElement("div", { className: "ov-card ov-chart-card" },
      React.createElement("h3", { className: "ov-card-title" }, "Order Breakdown"),
      statusBreakdown.length
        ? React.createElement(DonutChart, { data: statusBreakdown, total: orders.length })
        : React.createElement("p", { className: "ov-empty-hint" }, "Place some orders to see your breakdown.")
    ),

    React.createElement("div", { className: "ov-card" },
      React.createElement("div", { className: "ov-card-header" },
        React.createElement("h3", { className: "ov-card-title" }, "Recent Orders"),
        React.createElement("button", {
          className: "ov-see-all",
          onClick: () => onNavigate("orders"),
        }, "See all \u2192")
      ),
      recentOrders.length
        ? React.createElement("div", { className: "ov-recent-list" },
            recentOrders.map((order) => {
              const m = STATUS_META[order.status] || STATUS_META.pending;
              return React.createElement("div", { key: order._id, className: "ov-recent-row" },
                React.createElement("div", { className: "ov-recent-info" },
                  React.createElement("p", { className: "ov-recent-vendor" },
                    order.vendor?.businessName || "Vendor"
                  ),
                  React.createElement("p", { className: "ov-recent-date" },
                    new Date(order.createdAt).toLocaleDateString("en-ZA", {
                      day: "numeric", month: "short", year: "numeric",
                    })
                  )
                ),
                React.createElement("div", { className: "ov-recent-right" },
                  React.createElement("p", { className: "ov-recent-amount" },
                    fmtRand(order.totalAmount || 0)
                  ),
                  React.createElement("span", {
                    className: "ov-badge",
                    style: { background: m.bg, border: "1px solid " + m.border, color: m.text },
                  }, m.label)
                )
              );
            })
          )
        : React.createElement("p", { className: "ov-empty-hint" }, "No orders yet. Browse vendors to get started!")
    )
  );
};

// ── Main Student component ────────────────────────────────────────────────────

const Student = () => {
  const {
    cartItems, cartTotal, cartCount,
    addToCart, removeFromCart, updateQuantity, clearCart, getCartByVendor,
  } = useCart();
  const { getAccessTokenSilently, user: auth0User } = useAuth0();

  const [searchParams] = useSearchParams();
  const [expanded, setExpanded] = useState(false);

  const [activeNav, setActiveNav] = useState(searchParams.get("tab") || "overview");

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
        fetch(`${API_BASE_URL}/api/students/${auth0User.sub}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
      )
      .then((res) => res.ok ? res.json() : null)
      .then((data) => { if (data) setStudentProfile(data); })
      .catch(console.error);
  }, [auth0User, getAccessTokenSilently]);

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/vendors`)
      .then((res) => { if (!res.ok) throw new Error("Failed to fetch vendors"); return res.json(); })
      .then((data) => { setVendors(data); setLoadingVendors(false); })
      .catch((err) => { setError(err.message); setLoadingVendors(false); });
  }, []);

  useEffect(() => {
    if (!selectedVendor) return;
    setLoadingMenu(true);
    setMenuItems([]);
    fetch(`${API_BASE_URL}/api/menu-items/vendor/${selectedVendor._id}`)
      .then((res) => { if (!res.ok) throw new Error("Failed to fetch menu"); return res.json(); })
      .then((data) => { setMenuItems(data); setLoadingMenu(false); })
      .catch((err) => { setError(err.message); setLoadingMenu(false); });
  }, [selectedVendor]);

  const filteredItems =
    activeCategory === "All" ? menuItems : menuItems.filter((i) => i.category === activeCategory);

  const handleAddToCart = (item) => {
    if (!selectedVendor || item.isSoldOut) return;
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
        return fetch(`${API_BASE_URL}/api/orders`, {
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
              activeNav === "overview" && "Your activity at a glance"
            )
          ),
          React.createElement(ProfilePanel, { role: "student", user: studentProfile })
        ),

        // ── Overview page ─────────────────────────────────────────────
        activeNav === "overview" && React.createElement(StudentOverview, {
          studentProfile,
          onNavigate: setActiveNav,
        }),

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
                        React.createElement("article", {
                          key: item._id,
                          className: `kd-menu-card${item.isSoldOut ? " kd-menu-card--sold-out" : ""}`,
                        },
                          React.createElement("figure", { style: { position: "relative" } },
                            item.imageUrl && React.createElement("img", {
                              src: item.imageUrl, alt: item.name, className: "kd-menu-image", loading: "lazy",
                            }),
                            item.isSoldOut && React.createElement("span", {
                              className: "kd-sold-out-badge",
                              "aria-label": "Sold out",
                            }, "Sold Out")
                          ),

                          React.createElement("section", null,
                            React.createElement("h2", null, item.name),
                            React.createElement("p", null, item.description),
                            item.category && React.createElement("p", null,
                              React.createElement("small", null, item.category)
                            ),
                            item.dietaryTags?.length > 0 && React.createElement("div", { className: "kd-tag-row" },
                              item.dietaryTags.map((tag) => {
                                const c = DIETARY_COLOURS[tag];
                                return React.createElement("span", {
                                  key: tag,
                                  className: "kd-info-badge",
                                  style: c ? { background: c.bg, borderColor: c.border, color: c.text } : {},
                                }, tag);
                              })
                            ),
                            item.allergens?.length > 0 && React.createElement("div", { className: "kd-tag-row" },
                              item.allergens.map((a) => {
                                const c = ALLERGEN_COLOURS[a];
                                return React.createElement("span", {
                                  key: a,
                                  className: "kd-info-badge kd-allergen-badge",
                                  style: c ? { background: c.bg, borderColor: c.border, color: c.text } : {},
                                }, `⚠ ${a}`);
                              })
                            )
                          ),

                          React.createElement("footer", null,
                            React.createElement("data", { value: item.price }, `R${Number(item.price).toFixed(2)}`),
                            React.createElement("button", {
                              className: `kd-btn${item.isSoldOut ? " kd-btn--unavailable" : ""}`,
                              onClick: () => handleAddToCart(item),
                              disabled: item.isSoldOut,
                              "aria-disabled": item.isSoldOut,
                            }, item.isSoldOut ? "Unavailable" : "+ Add")
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
                            React.createElement("button", { className: "kd-remove-btn", onClick: () => removeFromCart(item._id) }, "Remove"),
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
                    `You have items from ${cartByVendor.length} vendors — a separate order will be placed for each.`
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

        // ── Orders page ───────────────────────────────────────────────
        activeNav === "orders" && React.createElement(OrderTracking, {
          successOrders: orderSuccess,
          ReviewFormComponent: ReviewForm,
        }),

        // ── Placeholder pages ─────────────────────────────────────────
        (activeNav === "about" || activeNav === "settings") &&
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