// OrderTracking.js
import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth0 } from "@auth0/auth0-react";
import "./OrderTracking.css";
import ReviewForm from "../ReviewForm";

const STATUS_STEPS = [
  { key: "pending",    label: "Placed",     description: "Order received, awaiting vendor confirmation" },
  { key: "received",   label: "Confirmed",  description: "Vendor confirmed — complete your payment" },
  { key: "paid",       label: "Paid",       description: "Payment confirmed" },
  { key: "preparing",  label: "Preparing",  description: "Kitchen is on it" },
  { key: "ready",      label: "Ready",      description: "Come collect your order" },
  { key: "collected",  label: "Collected",  description: "Enjoy" },
];

const CANCELLED = { key: "cancelled", label: "Cancelled", description: "Order was cancelled" };

const POLL_INTERVAL = 5000;

const statusIndex = (status) => STATUS_STEPS.findIndex((s) => s.key === status);

const formatTime = (dateStr) => {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  return d.toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit" });
};

const formatDate = (dateStr) => {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const today = new Date();
  const isToday = d.toDateString() === today.toDateString();
  if (isToday) return `Today at ${formatTime(dateStr)}`;
  return d.toLocaleDateString("en-ZA", { day: "numeric", month: "short" }) + " · " + formatTime(dateStr);
};

// ── Single order expanded detail ─────────────────────────────────────
const OrderDetail = ({ order, onBack }) => {
  const navigate    = useNavigate();
  const isCancelled = order.status === "cancelled";
  const steps       = STATUS_STEPS;
  const currentIdx  = isCancelled ? -1 : statusIndex(order.status);

  return (
    <article className="ot-detail">
      <button className="ot-back-btn" onClick={onBack}>← Back to orders</button>

      <header className="ot-detail-header">
        <section>
          <p className="ot-detail-vendor">{order.vendor?.businessName || "Vendor"}</p>
          <h2 className="ot-detail-number">
            {order.orderNumber ? `#${order.orderNumber}` : `Order`}
          </h2>
          <p className="ot-detail-time">{formatDate(order.createdAt)}</p>
        </section>
        <section className="ot-detail-total">
          <span className="ot-detail-total-label">Total</span>
          <span className="ot-detail-total-amount">R{Number(order.totalAmount).toFixed(2)}</span>
        </section>
      </header>

      {/* STATUS STEPPER */}
      {isCancelled ? (
        <section className="ot-cancelled-banner">
          <span>{CANCELLED.label} — {CANCELLED.description}</span>
        </section>
      ) : (
        <section className="ot-stepper">
          {steps.map((step, idx) => {
            const done   = idx < currentIdx;
            const active = idx === currentIdx;
            return (
              <React.Fragment key={step.key}>
                <section className={`ot-step ${done ? "done" : active ? "active" : "pending"}`}>
                  <section className="ot-step-info">
                    <p className="ot-step-label">{step.label}</p>
                    {active && <p className="ot-step-desc">{step.description}</p>}
                  </section>
                  {done   && <span className="ot-step-check">✓</span>}
                  {active && <span className="ot-step-pulse" />}
                </section>
                {idx < steps.length - 1 && (
                  <span className={`ot-step-connector ${done ? "done" : ""}`} />
                )}
              </React.Fragment>
            );
          })}
        </section>
      )}

      {/* PAY NOW */}
      {order.status === "received" && (
        <section className="ot-pay-now">
          <p className="ot-pay-now-msg">
            Your order has been confirmed by the vendor. Complete your payment to proceed.
          </p>
          <button className="ot-pay-now-btn" onClick={() => navigate(`/payment/${order._id}`)}>
            Pay R{Number(order.totalAmount).toFixed(2)} →
          </button>
        </section>
      )}

      {/* COLLECTION CODE */}
      {order.status === "ready" && order.collectionCode && (
        <section className="ot-collection-code">
          <p className="ot-code-label">Your collection code</p>
          <p className="ot-code-value">{order.collectionCode}</p>
          <p className="ot-code-hint">Show this code when you collect your order</p>
        </section>
      )}

      {/* ESTIMATED TIME */}
      {order.estimatedReadyAt && order.status !== "collected" && order.status !== "cancelled" && (
        <section className="ot-eta">
          <span>Ready by <strong>{formatTime(order.estimatedReadyAt)}</strong></span>
        </section>
      )}

      {/* ITEMS */}
      <section className="ot-items">
        <h3 className="ot-items-title">Items</h3>
        <ul className="ot-items-list">
          {order.items?.map((item, i) => (
            <li key={i} className="ot-item-row">
              <section className="ot-item-info">
                <span className="ot-item-qty">{item.quantity}×</span>
                <span className="ot-item-name">{item.name}</span>
                {item.specialNote && (
                  <span className="ot-item-note">"{item.specialNote}"</span>
                )}
              </section>
              <span className="ot-item-price">R{Number(item.subtotal).toFixed(2)}</span>
            </li>
          ))}
        </ul>
        <footer className="ot-items-total">
          <span>Total</span>
          <span>R{Number(order.totalAmount).toFixed(2)}</span>
        </footer>
      </section>

      {/* REVIEW FORM */}
      <ReviewForm order={order} />
    </article>
  );
};

// ── Order card in list ───────────────────────────────────────────────
const OrderCard = ({ order, onClick }) => {
  const navigate    = useNavigate();
  const isCancelled = order.status === "cancelled";
  const isActive    = !["collected", "cancelled"].includes(order.status);
  const currentStep = STATUS_STEPS.find((s) => s.key === order.status);

  return (
    <article
      className={`ot-card ${isActive ? "active" : ""} ${isCancelled ? "cancelled" : ""}`}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onClick()}
    >
      <header className="ot-card-header">
        <section>
          <p className="ot-card-vendor">{order.vendor?.businessName || "Vendor"}</p>
          <p className="ot-card-number">
            {order.orderNumber ? `#${order.orderNumber}` : "Order"}
          </p>
        </section>
        <section className={`ot-card-status ${order.status}`}>
          <span>{isCancelled ? "Cancelled" : (currentStep?.label || order.status)}</span>
          {isActive && <span className="ot-status-dot" />}
        </section>
      </header>

      <section className="ot-card-body">
        <p className="ot-card-items">
          {order.items?.slice(0, 2).map((i) => i.name).join(", ")}
          {order.items?.length > 2 && ` +${order.items.length - 2} more`}
        </p>
        <p className="ot-card-meta">
          {formatDate(order.createdAt)} · R{Number(order.totalAmount).toFixed(2)}
        </p>
      </section>

      {order.status === "received" && (
        <button
          className="ot-card-pay-btn"
          onClick={(e) => { e.stopPropagation(); navigate(`/payment/${order._id}`); }}
        >
          Pay Now →
        </button>
      )}

      {isActive && !isCancelled && (
        <section className="ot-card-progress">
          <span
            className="ot-card-progress-fill"
            style={{ width: `${((statusIndex(order.status) + 1) / STATUS_STEPS.length) * 100}%` }}
          />
        </section>
      )}
    </article>
  );
};

// ── Main OrderTracking component ─────────────────────────────────────
const OrderTracking = ({ successOrders }) => {
  const { getAccessTokenSilently } = useAuth0();
  const [orders,        setOrders]        = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [activeTab,     setActiveTab]     = useState("active");
  const [lastUpdated,   setLastUpdated]   = useState(null);

  // ── ref so fetchOrders can read selectedOrder without it being a dep ──
  const selectedOrderRef = useRef(selectedOrder);
  useEffect(() => { selectedOrderRef.current = selectedOrder; }, [selectedOrder]);

  const fetchOrders = useCallback(async () => {
    try {
      const token = await getAccessTokenSilently({
        authorizationParams: { audience: process.env.REACT_APP_AUTH0_AUDIENCE },
      });
      const res = await fetch("/api/orders", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch orders");
      const data = await res.json();
      setOrders(data);
      setLastUpdated(new Date());
      setError(null);

      if (selectedOrderRef.current) {
        const refreshed = data.find((o) => o._id === selectedOrderRef.current._id);
        if (refreshed) setSelectedOrder(refreshed);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [getAccessTokenSilently]); // selectedOrder removed from deps

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchOrders]);

  const activeOrders  = orders.filter((o) => !["collected", "cancelled"].includes(o.status));
  const pastOrders    = orders.filter((o) =>  ["collected", "cancelled"].includes(o.status));
  const displayOrders = activeTab === "active" ? activeOrders : pastOrders;

  if (selectedOrder) {
    return (
      <OrderDetail
        order={selectedOrder}
        onBack={() => setSelectedOrder(null)}
      />
    );
  }

  return (
    <section className="ot-root">

      {successOrders?.length > 0 && (
        <aside className="ot-success-banner">
          <section>
            <strong>
              {successOrders.length} order{successOrders.length > 1 ? "s" : ""} placed!
            </strong>
            <p>We'll update you as your order progresses.</p>
          </section>
        </aside>
      )}

      <nav className="ot-tabs">
        <button
          className={`ot-tab ${activeTab === "active" ? "active" : ""}`}
          onClick={() => { setActiveTab("active"); setSelectedOrder(null); }}
        >
          Active
          {activeOrders.length > 0 && (
            <span className="ot-tab-badge">{activeOrders.length}</span>
          )}
        </button>
        <button
          className={`ot-tab ${activeTab === "past" ? "active" : ""}`}
          onClick={() => { setActiveTab("past"); setSelectedOrder(null); }}
        >
          Past
        </button>

        {lastUpdated && (
          <p className="ot-last-updated">Updated {formatTime(lastUpdated)}</p>
        )}
      </nav>

      {loading ? (
        <section className="ot-loading">
          <span className="ot-spinner" />
          <p>Loading orders…</p>
        </section>
      ) : error ? (
        <p className="ot-error">{error}</p>
      ) : displayOrders.length === 0 ? (
        <section className="ot-empty">
          <p>{activeTab === "active" ? "No active orders right now." : "No past orders yet."}</p>
        </section>
      ) : (
        <section className="ot-list">
          {displayOrders.map((order) => (
            <OrderCard
              key={order._id}
              order={order}
              onClick={() => setSelectedOrder(order)}
            />
          ))}
        </section>
      )}
    </section>
  );
};

export default OrderTracking;