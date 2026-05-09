// Dashboards/OrderManagement.js
import React, { useState, useEffect, useCallback, useRef } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import "./OrderManagement.css";

const POLL_INTERVAL = 5000;

// FIX 1: pending can now advance to received (no real payment step yet)
const NEXT_STATUS = {
  pending:   "received",   // vendor accepts order
  received:  null,         // waiting for student payment — vendor cannot advance
  paid:      "preparing",  // payment confirmed, vendor starts preparing
  preparing: "ready",
  ready:     "collected",
  collected: null,
  cancelled: null,
};

const NEXT_LABEL = {
  pending:   "Accept Order",
  paid:      "Start Preparing",
  preparing: "Mark Ready",
  ready:     "Mark Collected",
};

const STATUS_META = {
  pending:   { label: "Pending",   color: "var(--om-amber)",  bg: "var(--om-amber-bg)" },
  paid:      { label: "Paid",      color: "var(--om-blue)",   bg: "var(--om-blue-bg)"  },
  received:  { label: "Received",  color: "var(--om-indigo)", bg: "var(--om-indigo-bg)" },
  preparing: { label: "Preparing", color: "var(--om-amber)",  bg: "var(--om-amber-bg)" },
  ready:     { label: "Ready",     color: "var(--om-green)",  bg: "var(--om-green-bg)" },
  collected: { label: "Collected", color: "var(--om-muted)",  bg: "var(--om-muted-bg)" },
  cancelled: { label: "Cancelled", color: "var(--om-red)",    bg: "var(--om-red-bg)"   },
};

const STATUS_TABS = [
  { key: "active",    label: "Active",    statuses: ["pending", "paid", "received", "preparing", "ready"] },
  { key: "completed", label: "Completed", statuses: ["collected", "cancelled"] },
];

const formatTime = (dateStr) => {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit" });
};

const formatDate = (dateStr) => {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return `Today · ${formatTime(dateStr)}`;
  return d.toLocaleDateString("en-ZA", { day: "numeric", month: "short" }) + " · " + formatTime(dateStr);
};

const timeAgo = (dateStr) => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return "Just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
};

// ── Order detail panel ───────────────────────────────────────────────
const OrderPanel = ({ order, onClose, onAdvance, onCancel, advancing }) => {
  const [eta, setEta] = useState("");
  const meta = STATUS_META[order.status] || STATUS_META.pending;
  const nextStatus = NEXT_STATUS[order.status];

  const handleAdvance = () => {
    console.log("Advance button clicked for order:", order._id, "Current status:", order.status, "Next status:", nextStatus);
    if (nextStatus) {
      onAdvance(order._id, nextStatus, eta || undefined);
    } else {
      console.log("No next status available for:", order.status);
    }
  };

  const handleCancelClick = () => {
    console.log("Cancel button clicked for order:", order._id);
    onCancel(order._id);
  };

  return (
    <aside className="om-panel" role="dialog" aria-label="Order detail">
      <header className="om-panel-header">
        <section>
          <p className="om-panel-order-num">
            {order.orderNumber ? `#${order.orderNumber}` : "Order"}
          </p>
          <p className="om-panel-student">
            {order.student
              ? `${order.student.firstName} ${order.student.lastName}`
              : "Student"}
          </p>
        </section>
        <button className="om-panel-close" onClick={onClose} aria-label="Close panel">✕</button>
      </header>

      <section
        className="om-panel-status"
        style={{ color: meta.color, background: meta.bg }}
      >
        {meta.label}
      </section>

      <p className="om-panel-time">{formatDate(order.createdAt)}</p>

      {/* Items */}
      <section className="om-panel-items">
        <h3 className="om-panel-section-title">Items</h3>
        <ul className="om-panel-item-list">
          {order.items?.map((item, i) => (
            <li key={i} className="om-panel-item-row">
              <section className="om-panel-item-left">
                <span className="om-panel-item-qty">{item.quantity}×</span>
                <section>
                  <p className="om-panel-item-name">{item.name}</p>
                  {item.specialNote && (
                    <p className="om-panel-item-note">"{item.specialNote}"</p>
                  )}
                </section>
              </section>
              <span className="om-panel-item-price">R{Number(item.subtotal).toFixed(2)}</span>
            </li>
          ))}
        </ul>
        <footer className="om-panel-item-total">
          <span>Total</span>
          <span>R{Number(order.totalAmount).toFixed(2)}</span>
        </footer>
      </section>

      {/* ETA input — shown when advancing to ready */}
      {order.status === "preparing" && (
        <section className="om-panel-eta">
          <label className="om-panel-section-title" htmlFor="eta-input">
            Estimated ready time (optional)
          </label>
          <input
            id="eta-input"
            type="time"
            className="om-eta-input"
            value={eta}
            onChange={(e) => setEta(e.target.value)}
          />
        </section>
      )}

      {/* Actions */}
      <footer className="om-panel-actions">
        {nextStatus && (
          <button
            className="om-btn advance"
            onClick={handleAdvance}
            disabled={advancing}
          >
            {advancing ? "Updating…" : (NEXT_LABEL[order.status] || "Advance")}
          </button>
        )}
        {!["collected", "cancelled"].includes(order.status) && (
          <button
            className="om-btn cancel"
            onClick={handleCancelClick}
            disabled={advancing}
          >
            Cancel Order
          </button>
        )}
      </footer>
    </aside>
  );
};

// ── Order card in list ───────────────────────────────────────────────
const OrderCard = ({ order, selected, onClick }) => {
  const meta = STATUS_META[order.status] || STATUS_META.pending;

  return (
    <article
      className={`om-card ${selected ? "selected" : ""}`}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onClick()}
    >
      <header className="om-card-header">
        <p className="om-card-number">
          {order.orderNumber ? `#${order.orderNumber}` : "Order"}
        </p>
        <span
          className="om-card-status-badge"
          style={{ color: meta.color, background: meta.bg }}
        >
          {meta.label}
        </span>
      </header>

      <p className="om-card-student">
        {order.student
          ? `${order.student.firstName} ${order.student.lastName}`
          : "Student"}
      </p>

      <p className="om-card-items-preview">
        {order.items?.slice(0, 2).map((i) => `${i.quantity}× ${i.name}`).join(", ")}
        {order.items?.length > 2 && ` +${order.items.length - 2} more`}
      </p>

      <footer className="om-card-footer">
        <span className="om-card-total">R{Number(order.totalAmount).toFixed(2)}</span>
        <span className="om-card-time">{timeAgo(order.createdAt)}</span>
      </footer>
    </article>
  );
};

// ── Main OrderManagement component ───────────────────────────────────
const OrderManagement = () => {
  const { getAccessTokenSilently } = useAuth0();

  const [orders, setOrders]               = useState([]);
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState(null);
  const [activeTab, setActiveTab]         = useState("active");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [advancing, setAdvancing]         = useState(false);
  const [lastUpdated, setLastUpdated]     = useState(null);

  // FIX 2: ref tracks selected order without being a useCallback dependency
  // This prevents the interval from restarting every time you click an order
  const selectedOrderRef = useRef(null);
  useEffect(() => {
    selectedOrderRef.current = selectedOrder;
  }, [selectedOrder]);

  const getToken = useCallback(
    () => getAccessTokenSilently({
      authorizationParams: { audience: process.env.REACT_APP_AUTH0_AUDIENCE },
    }),
    [getAccessTokenSilently]
  );

  const fetchOrders = useCallback(async (silent = false) => {
    try {
      const token = await getToken();
      console.log("Fetching vendor orders...");
      const res = await fetch("/api/vendors/orders", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || `Failed to fetch orders (${res.status})`);
      }
      const data = await res.json();
      console.log("Orders fetched:", data.length);
      setOrders(data);
      setLastUpdated(new Date());
      setError(null);

      // Use ref instead of selectedOrder state — no dependency, no loop
      const current = selectedOrderRef.current;
      if (current) {
        const refreshed = data.find((o) => o._id === current._id);
        if (refreshed) setSelectedOrder(refreshed);
      }
    } catch (err) {
      console.error("Fetch error:", err);
      setError(err.message);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [getToken]); // selectedOrder intentionally NOT here

  useEffect(() => {
    fetchOrders();
    const id = setInterval(() => fetchOrders(true), POLL_INTERVAL);
    return () => clearInterval(id);
  }, [fetchOrders]);

  const handleAdvance = async (orderId, newStatus, estimatedReadyAt) => {
    console.log("handleAdvance called with:", { orderId, newStatus, estimatedReadyAt });
    setAdvancing(true);
    try {
      const token = await getToken();
      const body = { status: newStatus };
      if (estimatedReadyAt) body.estimatedReadyAt = estimatedReadyAt;
      
      console.log("Sending PATCH request to:", `/api/orders/${orderId}/status`);
      console.log("Request body:", body);

      const res = await fetch(`/api/orders/${orderId}/status`, {
        method: "PATCH",
        headers: { 
          "Content-Type": "application/json", 
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify(body),
      });
      
      console.log("Response status:", res.status);
      
      if (!res.ok) {
        const errorText = await res.text();
        console.error("Error response:", errorText);
        throw new Error(`Failed to update status: ${res.status} ${errorText}`);
      }
      
      const updated = await res.json();
      console.log("Order updated:", updated);

      setOrders((prev) => prev.map((o) => (o._id === orderId ? updated : o)));
      setSelectedOrder(updated);
    } catch (err) {
      console.error("Error in handleAdvance:", err);
      setError(err.message);
    } finally {
      setAdvancing(false);
    }
  };

  const handleCancel = async (orderId) => {
    console.log("handleCancel called for order:", orderId);
    await handleAdvance(orderId, "cancelled");
  };

  const tabStatuses = STATUS_TABS.find((t) => t.key === activeTab)?.statuses || [];
  const filteredOrders = orders.filter((o) => tabStatuses.includes(o.status));

  const counts = STATUS_TABS.reduce((acc, tab) => {
    acc[tab.key] = orders.filter((o) => tab.statuses.includes(o.status)).length;
    return acc;
  }, {});

  return (
    <section className="om-root">
      {error && <div className="om-error-banner" style={{background: "red", color: "white", padding: "10px", margin: "10px", borderRadius: "5px"}}>Error: {error}</div>}
      <nav className="om-tabs">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.key}
            className={`om-tab ${activeTab === tab.key ? "active" : ""}`}
            onClick={() => { setActiveTab(tab.key); setSelectedOrder(null); }}
          >
            {tab.label}
            {counts[tab.key] > 0 && (
              <span className={`om-tab-badge ${tab.key === "active" ? "highlight" : ""}`}>
                {counts[tab.key]}
              </span>
            )}
          </button>
        ))}
        {lastUpdated && (
          <p className="om-last-updated">
            <span className="om-live-dot" />
            Live · {formatTime(lastUpdated)}
          </p>
        )}
      </nav>

      <section className={`om-content ${selectedOrder ? "with-panel" : ""}`}>
        <section className="om-list-col">
          {loading ? (
            <section className="om-state-container">
              <span className="om-spinner" />
              <p>Loading orders…</p>
            </section>
          ) : error ? (
            <p className="om-error">{error}</p>
          ) : filteredOrders.length === 0 ? (
            <section className="om-state-container">
              <p className="om-empty-label">
                {activeTab === "active" ? "No active orders right now" : "Nothing here yet"}
              </p>
            </section>
          ) : (
            <ul className="om-order-list">
              {filteredOrders.map((order) => (
                <li key={order._id}>
                  <OrderCard
                    order={order}
                    selected={selectedOrder?._id === order._id}
                    onClick={() => setSelectedOrder(
                      selectedOrder?._id === order._id ? null : order
                    )}
                  />
                </li>
              ))}
            </ul>
          )}
        </section>

        {selectedOrder && (
          <OrderPanel
            order={selectedOrder}
            onClose={() => setSelectedOrder(null)}
            onAdvance={handleAdvance}
            onCancel={handleCancel}
            advancing={advancing}
          />
        )}
      </section>
    </section>
  );
};

export default OrderManagement;