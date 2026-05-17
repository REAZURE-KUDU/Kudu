// Dashboards/Vendor.js
import React, { useState, useRef, useEffect, useCallback } from "react";
import "./Vendor.css";
import { useLocation } from "react-router-dom";
import { useAuth0 } from "@auth0/auth0-react";
import ProfilePanel from "./ProfilePanel";
import OrderManagement from "./OrderManagement";
import VendorReviews from "../VendorReviews";
import API_BASE_URL from '../api';

const CATEGORIES = ["Food", "Drink", "Snack", "Dessert", "Other"];

const ALLERGENS = [
  "milk", "eggs", "fish", "shellfish",
  "tree nuts", "peanuts", "wheat", "soy", "sesame",
];

const DIETARY_TAGS = ["halal", "vegetarian", "vegan", "dairy-free"];

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
  halal:        { bg: "rgba(34,197,94,0.15)",  border: "rgba(34,197,94,0.4)",  text: "#4ade80"  },
  vegetarian:   { bg: "rgba(16,185,129,0.15)", border: "rgba(16,185,129,0.4)", text: "#34d399"  },
  vegan:        { bg: "rgba(5,150,105,0.15)",  border: "rgba(5,150,105,0.4)",  text: "#10b981"  },
  "dairy-free": { bg: "rgba(56,189,248,0.15)", border: "rgba(56,189,248,0.4)", text: "#38bdf8"  },
};

const EMPTY_FORM = {
  name: "",
  description: "",
  priceCents: 0,
  category: "Food",
  imageUrl: "",
  allergens: [],
  dietaryTags: [],
};

// ── Overview helpers ──────────────────────────────────────────────────────────

const STATUS_ORDER = ["pending", "paid", "received", "preparing", "ready", "collected", "cancelled"];

const STATUS_META = {
  pending:   { label: "Pending",   colour: "#f59e0b", bg: "rgba(245,158,11,0.12)"  },
  paid:      { label: "Paid",      colour: "#3b82f6", bg: "rgba(59,130,246,0.12)"  },
  received:  { label: "Received",  colour: "#8b5cf6", bg: "rgba(139,92,246,0.12)"  },
  preparing: { label: "Preparing", colour: "#f97316", bg: "rgba(249,115,22,0.12)"  },
  ready:     { label: "Ready",     colour: "#10b981", bg: "rgba(16,185,129,0.12)"  },
  collected: { label: "Collected", colour: "#64748b", bg: "rgba(100,116,139,0.12)" },
  cancelled: { label: "Cancelled", colour: "#ef4444", bg: "rgba(239,68,68,0.12)"   },
};

const fmtPrice = (amount) => `R${Number(amount || 0).toFixed(2)}`;

const StarRating = ({ value }) => {
  const full  = Math.floor(value);
  const half  = value - full >= 0.5;
  const empty = 5 - full - (half ? 1 : 0);
  return (
    <span className="ov-stars" aria-label={`${value.toFixed(1)} out of 5`}>
      {"★".repeat(full)}{half ? "½" : ""}{"☆".repeat(empty)}
    </span>
  );
};

// ─────────────────────────────────────────────────────────────────────────────

const Vendor = () => {
  const { getAccessTokenSilently, logout } = useAuth0();
  const location = useLocation();
  const locationVendorId = location.state?.vendorId || sessionStorage.getItem('vendorId') || "";
  console.log('locationVendorId:', locationVendorId);
  console.log('location.state:', location.state);
  console.log('sessionStorage vendorId:', sessionStorage.getItem('vendorId'));

  const [expanded,        setExpanded]        = useState(false);
  const [activeNav,       setActiveNav]        = useState("overview");
  const [menuItems,       setMenuItems]        = useState([]);
  const [vendorProfile,   setVendorProfile]    = useState(null);

  const [modal,           setModal]            = useState(null);
  const [formData,        setFormData]         = useState(EMPTY_FORM);
  const [editingId,       setEditingId]        = useState(null);
  const [pendingDeleteId, setPendingDeleteId]  = useState(null);
  const [formError,       setFormError]        = useState("");

  const [isSuspended,     setIsSuspended]      = useState(false);
  const [appealMessage,   setAppealMessage]    = useState("");
  const [appealState,     setAppealState]      = useState("idle");
  const [appealError,     setAppealError]      = useState("");
  const [appealRejectionReason, setAppealRejectionReason] = useState("");

  // ── Overview state ───────────────────────────────────────────────────────
  const [ovOrders,      setOvOrders]      = useState([]);
  const [ovReviews,     setOvReviews]     = useState([]);
  const [ovLoading,     setOvLoading]     = useState(true);
  const [ovTimeFilter,  setOvTimeFilter]  = useState("all");

  const fileInputRef = useRef(null);

  const getToken = useCallback(
    () => getAccessTokenSilently({
      authorizationParams: { audience: process.env.REACT_APP_AUTH0_AUDIENCE },
    }),
    [getAccessTokenSilently]
  );

  useEffect(() => {
    if (location.state?.vendorId) {
      sessionStorage.setItem('vendorId', location.state.vendorId);
    }
  }, [location.state?.vendorId]);

  const vendorId = locationVendorId || vendorProfile?._id || vendorProfile?.id || "";

  // ── Data fetchers ────────────────────────────────────────────────────────

  const fetchVendorProfile = useCallback(async () => {
    const id = locationVendorId;
    if (!id) return;
    try {
      const token = await getToken();
      const res = await fetch(`${API_BASE_URL}/api/vendors/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch vendor profile");
      const data = await res.json();
      setVendorProfile(data);
      if (data.status === "suspended") {
        setIsSuspended(true);
        return true;
      }
    } catch (err) {
      console.error("Error fetching vendor profile:", err);
    }
    return false;
  }, [locationVendorId, getToken]);

  const fetchMenuItems = useCallback(async () => {
    if (!vendorId) return;
    try {
      const token = await getToken();
      const res = await fetch(`${API_BASE_URL}/api/menu-items/vendor/${vendorId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setMenuItems(data.map((item) => ({ ...item, id: item._id })));
    } catch (err) {
      console.error("Error fetching menu items:", err);
    }
  }, [vendorId, getToken]);

  const fetchExistingAppeal = useCallback(async () => {
    if (!vendorId) return;
    try {
      const token = await getToken();
      const res = await fetch(`${API_BASE_URL}/api/appeals/vendor/${vendorId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data?.status === "pending") {
        setAppealState("duplicate");
      } else if (data?.status === "reviewed" && data?.decision === "rejected") {
        setAppealRejectionReason(data.rejectionReason || "");
        setAppealState("rejected");
      }
    } catch (err) {
      console.error("Error checking existing appeal:", err);
    }
  }, [vendorId, getToken]);

  const fetchOverviewData = useCallback(async () => {
    if (!vendorId) return;
    setOvLoading(true);
    try {
      const token = await getToken();
      // GET /api/orders/vendor uses attachVendor middleware — identifies vendor from token
      // GET /api/reviews/vendor/:vendorId is a public/vendor endpoint
      const [ordersRes, reviewsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/orders/vendor`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_BASE_URL}/api/reviews/vendor/${vendorId}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (ordersRes.ok) {
        const raw = await ordersRes.json();
        // Guard against { message, orders: [] } shape on empty results
        setOvOrders(Array.isArray(raw) ? raw : raw.orders || []);
      } else {
        console.error("Orders fetch failed:", ordersRes.status);
      }

      if (reviewsRes.ok) {
        const raw = await reviewsRes.json();
        setOvReviews(Array.isArray(raw) ? raw : raw.reviews || []);
      } else {
        console.error("Reviews fetch failed:", reviewsRes.status);
      }
    } catch (err) {
      console.error("Overview fetch error:", err);
    } finally {
      setOvLoading(false);
    }
  }, [vendorId, getToken]);

  useEffect(() => {
    fetchMenuItems();
    fetchVendorProfile().then((suspended) => {
      if (suspended) fetchExistingAppeal();
    });
    fetchOverviewData();
  }, [fetchMenuItems, fetchVendorProfile, fetchExistingAppeal, fetchOverviewData]);

  // ── Overview derived data ────────────────────────────────────────────────

  const now = new Date();

  const filteredOrders = useCallback((all) => {
    return all.filter((o) => {
      const d = new Date(o.createdAt);
      if (ovTimeFilter === "today") return d.toDateString() === now.toDateString();
      if (ovTimeFilter === "week")  { const w = new Date(now); w.setDate(now.getDate() - 7); return d >= w; }
      if (ovTimeFilter === "month") return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      return true;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ovTimeFilter]);

  const periodOrders   = filteredOrders(ovOrders);
  const activeOrders   = ovOrders.filter((o) => ["paid","received","preparing","ready"].includes(o.status));
  const collected      = periodOrders.filter((o) => o.status === "collected");
  const revenue        = collected.reduce((s, o) => {
    const total = o.totalAmount || o.subtotal
      || (o.items || []).reduce((sum, i) => sum + (i.subtotal || (i.unitPrice || 0) * (i.quantity || 1)), 0);
    return s + (total || 0);
  }, 0);
  const soldOutCount   = menuItems.filter((m) => m.isSoldOut).length;
  const avgRating      = ovReviews.length
    ? ovReviews.reduce((s, r) => s + (r.rating || 0), 0) / ovReviews.length
    : null;

  const statusCounts = STATUS_ORDER.reduce((acc, s) => {
    acc[s] = ovOrders.filter((o) => o.status === s).length;
    return acc;
  }, {});
  const maxCount = Math.max(...Object.values(statusCounts), 1);

  const recentOrders = [...ovOrders]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 5);

  const itemFreq = {};
  collected.forEach((o) => {
    (o.items || []).forEach((i) => {
      const name = i.menuItem?.name || i.name || "Unknown";
      itemFreq[name] = (itemFreq[name] || 0) + (i.quantity || 1);
    });
  });
  const topItems = Object.entries(itemFreq).sort((a, b) => b[1] - a[1]).slice(0, 3);

  // ── Profile update ───────────────────────────────────────────────────────

  const handleProfileUpdate = async (formData) => {
    const token = await getToken();
    const res = await fetch(`${API_BASE_URL}/api/vendors/${vendorId}/profile`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    if (!res.ok) { const err = await res.json(); throw new Error(err.message || "Update failed"); }
    const updated = await res.json();
    setVendorProfile(updated);
  };

  // ── Sold-out toggle ──────────────────────────────────────────────────────

  const handleToggleSoldOut = async (item) => {
    try {
      const token = await getToken();
      const res = await fetch(`${API_BASE_URL}/api/menu-items/${item.id}/sold-out`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to update availability");
      setMenuItems((prev) =>
        prev.map((m) => m.id === item.id ? { ...m, isSoldOut: !m.isSoldOut } : m)
      );
    } catch (err) {
      console.error("Error toggling sold out:", err);
    }
  };

  // ── Checkbox helpers ─────────────────────────────────────────────────────

  const handleCheckboxChange = (field, value) => {
    setFormData((prev) => {
      const current = prev[field] || [];
      return {
        ...prev,
        [field]: current.includes(value)
          ? current.filter((v) => v !== value)
          : [...current, value],
      };
    });
  };

  // ── Menu modal helpers ───────────────────────────────────────────────────

  const openAddModal = () => { setFormData(EMPTY_FORM); setEditingId(null); setFormError(""); setModal("add"); };
  const openEditModal = (item) => {
    setFormData({
      name:        item.name        || "",
      description: item.description || "",
      priceCents:  Math.round((Number(item.price) || 0) * 100),
      category:    item.category    || "Food",
      imageUrl:    item.imageUrl    || "",
      allergens:   item.allergens   || [],
      dietaryTags: item.dietaryTags || [],
    });
    setEditingId(item.id);
    setFormError("");
    setModal("edit");
  };
  const openDeleteModal = (id) => { setPendingDeleteId(id); setModal("delete"); };
  const closeModal = () => { setModal(null); setEditingId(null); setPendingDeleteId(null); setFormError(""); };
  const handleFieldChange = (e) => { const { name, value } = e.target; setFormData((prev) => ({ ...prev, [name]: value })); };

  const handlePriceKeyDown = (e) => {
    const allowed = ["Backspace", "Tab", "ArrowLeft", "ArrowRight"];
    if (allowed.includes(e.key)) {
      if (e.key === "Backspace") { e.preventDefault(); setFormData((prev) => ({ ...prev, priceCents: Math.floor(prev.priceCents / 10) })); }
      return;
    }
    if (!/^\d$/.test(e.key)) { e.preventDefault(); return; }
    e.preventDefault();
    setFormData((prev) => ({ ...prev, priceCents: prev.priceCents * 10 + parseInt(e.key, 10) }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setFormData((prev) => ({ ...prev, imageUrl: ev.target.result }));
    reader.readAsDataURL(file);
  };

  const handleSubmitAdd = async (e) => {
    e.preventDefault(); setFormError("");
    try {
      const token = await getToken();
      const { priceCents, ...rest } = formData;
      const res = await fetch(`${API_BASE_URL}/api/menu-items`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...rest, price: priceCents / 100, vendor: vendorId }),
      });
      if (!res.ok) { const data = await res.json(); setFormError(data.message || "Something went wrong"); return; }
      await fetchMenuItems();
      closeModal();
    } catch (err) { console.error(err); setFormError("Something went wrong. Please try again."); }
  };

  const handleSubmitEdit = async (e) => {
    e.preventDefault(); setFormError("");
    try {
      const token = await getToken();
      const { priceCents, ...rest } = formData;
      const res = await fetch(`${API_BASE_URL}/api/menu-items/${editingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...rest, price: priceCents / 100 }),
      });
      if (!res.ok) { const data = await res.json(); setFormError(data.message || "Something went wrong"); return; }
      await fetchMenuItems();
      closeModal();
    } catch (err) { console.error(err); setFormError("Something went wrong. Please try again."); }
  };

  const handleConfirmDelete = async () => {
    try {
      const token = await getToken();
      const res = await fetch(`${API_BASE_URL}/api/menu-items/${pendingDeleteId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(await res.text());
      await fetchMenuItems();
      closeModal();
    } catch (err) { console.error(err); }
  };

  const pendingDeleteItem = menuItems.find((item) => item.id === pendingDeleteId);

  const handleSubmitAppeal = async () => {
    if (!appealMessage.trim()) return;
    const previousState = appealState;
    setAppealState("pending"); setAppealError("");
    try {
      const token = await getToken();
      const res = await fetch(`${API_BASE_URL}/api/appeals`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ vendorId, message: appealMessage }),
      });
      if (res.status === 409) { setAppealState("duplicate"); return; }
      if (!res.ok) { const 
        data = await res.json(); 
        setAppealError(data.message || "Something went wrong."); 
        setAppealState(previousState); 
        return; 
      }
      setAppealState("submitted");
    } catch (err) { 
      console.error(err); 
      setAppealError("Something went wrong. Please try again."); 
      setAppealState(previousState); 
    }
  };

  /* ── Checkbox group ── */
  const renderCheckboxGroup = (label, field, options, colourMap) => (
    <section className="kd-field">
      <span className="kd-label">{label}</span>
      <div className="kd-checkbox-grid">
        {options.map((opt) => {
          const checked = (formData[field] || []).includes(opt);
          const colours = colourMap[opt];
          return (
            <label key={opt} className={`kd-checkbox-chip ${checked ? "checked" : ""}`}
              style={checked && colours ? { background: colours.bg, borderColor: colours.border, color: colours.text } : {}}>
              <input type="checkbox" checked={checked} onChange={() => handleCheckboxChange(field, opt)} />
              {opt}
            </label>
          );
        })}
      </div>
    </section>
  );

  /* ── Shared form ── */
  const renderForm = (onSubmit) => (
    <form className="kd-form" onSubmit={onSubmit} noValidate>
      <fieldset style={{ border: "none", display: "contents" }}>
        <legend className="kd-modal-title">{modal === "add" ? "Add menu item" : "Edit menu item"}</legend>
        {formError && <p className="kd-form-error" role="alert">{formError}</p>}
        <section className="kd-field">
          <label className="kd-label" htmlFor="item-name">Name</label>
          <input id="item-name" className="kd-input" type="text" name="name"
            value={formData.name} onChange={handleFieldChange} placeholder="e.g. Mango Smoothie" required autoComplete="off" />
        </section>
        <section className="kd-field">
          <label className="kd-label" htmlFor="item-description">Description</label>
          <textarea id="item-description" className="kd-textarea" name="description"
            value={formData.description} onChange={handleFieldChange} placeholder="A short description…" />
        </section>
        <section className="kd-field">
          <label className="kd-label" htmlFor="item-price">Price (R)</label>
          <input id="item-price" className="kd-input" type="text" inputMode="numeric" name="price"
            value={(formData.priceCents / 100).toFixed(2)} onKeyDown={handlePriceKeyDown} onChange={() => {}} placeholder="0.00" required />
        </section>
        <section className="kd-field">
          <label className="kd-label" htmlFor="item-category">Category</label>
          <select id="item-category" className="kd-select" name="category" value={formData.category} onChange={handleFieldChange}>
            {CATEGORIES.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
          </select>
        </section>
        {renderCheckboxGroup("Contains allergens", "allergens", ALLERGENS, ALLERGEN_COLOURS)}
        {renderCheckboxGroup("Dietary info", "dietaryTags", DIETARY_TAGS, DIETARY_COLOURS)}
        <section className="kd-field">
          <label className="kd-label" htmlFor="item-image">Photo</label>
          <label className="kd-upload-area" htmlFor="item-image">
            {formData.imageUrl ? (
              <img src={formData.imageUrl} alt="Preview" className="kd-upload-preview" />
            ) : (
              <>
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 16l4-4 4 4 4-6 4 6" /><rect x="3" y="3" width="18" height="18" rx="3" /></svg>
                <p>Click to upload a photo</p>
                <small className="kd-upload-hint">PNG, JPG or WEBP — max 5 MB</small>
              </>
            )}
          </label>
          <input id="item-image" className="kd-file-input" type="file" accept="image/*" ref={fileInputRef} onChange={handleImageChange} />
        </section>
        <footer className="kd-form-footer">
          <button type="button" className="kd-btn ghost" onClick={closeModal}>Cancel</button>
          <button type="submit" className="kd-btn primary">{modal === "add" ? "Add item" : "Save changes"}</button>
        </footer>
      </fieldset>
    </form>
  );

  /* ── Page title/sub helpers ── */
  const PAGE_TITLES = { overview: "Overview", menu: "Menu", orders: "Orders", reviews: "Reviews" };
  const PAGE_SUBS   = {
    overview: "Your shop at a glance",
    menu:     "Manage what you sell",
    orders:   "Manage and advance customer orders",
    reviews:  "See what your customers are saying",
  };

  /* ════════════════════════════════════════════════════════════════════════════
     RENDER
  ════════════════════════════════════════════════════════════════════════════ */
  return (
    <main className="kd-app">

      {/* ── Suspension overlay ── */}
      {isSuspended && (
        <section className="kd-modal-overlay" role="alertdialog" aria-modal="true"
          aria-labelledby="suspended-title" style={{ zIndex: 9999 }}>
          <article className="kd-modal" style={{ maxWidth: 480, padding: "36px 40px" }}>
            <section style={{ width: 48, height: 48, borderRadius: "50%", background: "rgba(239,68,68,0.12)",
              display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
              <svg viewBox="0 0 24 24" width={22} height={22} fill="none" stroke="#ef4444" strokeWidth={2} strokeLinecap="round">
                <circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" />
              </svg>
            </section>
            <h2 className="kd-modal-title" id="suspended-title" style={{ textAlign: "center", marginBottom: 3 }}>Account suspended</h2>
            {vendorProfile?.statusReason && (
              <p style={{ textAlign: "center", fontSize: 13, color: "#64748b", marginBottom: 3 }}>
                Reason: <strong style={{ color: "#e2e8f0" }}>{vendorProfile.statusReason}</strong>
              </p>
            )}
            <hr style={{ border: "none", borderTop: "1px solid rgba(110,231,183,0.1)", marginBottom: 4 }} />
            {appealState === "idle" && (
              <>
                <p style={{ fontSize: 13, color: "#64748b", marginBottom: 16, lineHeight: 1.6 }}>
                  If you believe this is a mistake, submit an appeal below. Our team will review it and get back to you.
                </p>
                <section style={{ marginBottom: 12 }}>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#94a3b8",
                    textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>
                    Your appeal message
                  </label>
                  <textarea className="kd-textarea" placeholder="Explain why this suspension should be reversed…"
                    value={appealMessage} onChange={(e) => setAppealMessage(e.target.value)} maxLength={1000} rows={5} />
                  <p style={{ fontSize: 11, color: "#64748b", textAlign: "right", marginTop: 4 }}>{appealMessage.length}/1000</p>
                </section>
                {appealError && <p className="kd-form-error" role="alert" style={{ marginBottom: 16 }}>{appealError}</p>}
                <footer style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 8 }}>
                  <button className="kd-btn primary" onClick={handleSubmitAppeal} disabled={!appealMessage.trim()} style={{ width: "100%" }}>Submit appeal</button>
                  <button className="kd-btn ghost" onClick={() => logout({ returnTo: window.location.origin })} style={{ width: "100%" }}>Sign out</button>
                </footer>
              </>
            )}
            {appealState === "pending" && (
              <p style={{ textAlign: "center", fontSize: 13, color: "#64748b" }}>Submitting your appeal…</p>
            )}
            {appealState === "submitted" && (
              <>
                <section style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)",
                  borderRadius: 10, padding: "16px 18px", marginBottom: 24, textAlign: "center" }}>
                  <p style={{ fontSize: 20, marginBottom: 6 }}>✓</p>
                  <p style={{ fontSize: 13, color: "#e2e8f0", lineHeight: 1.6 }}>
                    Appeal submitted. Check your email for confirmation — our team will be in touch soon.
                  </p>
                </section>
                <button className="kd-btn ghost" onClick={() => logout({ returnTo: window.location.origin })} style={{ width: "100%" }}>Sign out</button>
              </>
            )}
            {appealState === "duplicate" && (
              <>
                <section style={{ background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.2)",
                  borderRadius: 10, padding: "16px 18px", marginBottom: 24, textAlign: "center" }}>
                  <p style={{ fontSize: 20, marginBottom: 6 }}>⏳</p>
                  <p style={{ fontSize: 13, color: "#e2e8f0", lineHeight: 1.6 }}>
                    You already have a pending appeal. Our team will review it shortly.
                  </p>
                </section>
                <button className="kd-btn ghost" onClick={() => logout({ returnTo: window.location.origin })} style={{ width: "100%" }}>Sign out</button>
              </>
            )}
            {appealState === "rejected" && (
              <>
                <section style={{
                  background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)",
                  borderRadius: 10, padding: "16px 18px", marginBottom: 20,
                }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: "#f87171", marginBottom: 6 }}>
                    ✕ Your appeal was rejected
                  </p>
                  {appealRejectionReason && (
                    <p style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.6, marginBottom: 0 }}>
                      <strong style={{ color: "#cbd5e1" }}>Reason: </strong>{appealRejectionReason}
                    </p>
                  )}
                </section>
                <p style={{ fontSize: 13, color: "#64748b", marginBottom: 16, lineHeight: 1.6 }}>
                  You can submit a new appeal if you believe this decision was made in error.
                </p>
                <section style={{ marginBottom: 12 }}>
                  <label style={{
                    display: "block", fontSize: 12, fontWeight: 600, color: "#94a3b8",
                    textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8,
                  }}>
                    New appeal message
                  </label>
                  <textarea
                    className="kd-textarea"
                    placeholder="Explain why this suspension should be reversed…"
                    value={appealMessage}
                    onChange={(e) => setAppealMessage(e.target.value)}
                    maxLength={1000}
                    rows={5}
                  />
                  <p style={{ fontSize: 11, color: "#64748b", textAlign: "right", marginTop: 4 }}>
                    {appealMessage.length}/1000
                  </p>
                </section>
                {appealError && <p className="kd-form-error" role="alert" style={{ marginBottom: 16 }}>{appealError}</p>}
                <footer style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 8 }}>
                  <button
                    className="kd-btn primary"
                    onClick={handleSubmitAppeal}
                    disabled={!appealMessage.trim()}
                    style={{ width: "100%" }}
                  >
                    Resubmit appeal
                  </button>
                  <button
                    className="kd-btn ghost"
                    onClick={() => logout({ returnTo: window.location.origin })}
                    style={{ width: "100%" }}
                  >
                    Sign out
                  </button>
                </footer>
              </>
            )}
          </article>
        </section>
      )}

      {/* ── Sidebar ── */}
      <aside className={`kd-sidebar ${expanded ? "expanded" : ""}`}
        onMouseEnter={() => setExpanded(true)} onMouseLeave={() => setExpanded(false)}
        aria-label="Vendor navigation">
        <header className="kd-logo" aria-label="KuduDash vendor portal">
          {expanded ? "KuduDash" : "KD"}
        </header>
        <nav className="kd-nav" aria-label="Main menu">
          <ul>
            {/* Overview */}
            <li>
              <button className={`kd-nav-item ${activeNav === "overview" ? "active" : ""}`}
                onClick={() => setActiveNav("overview")} aria-current={activeNav === "overview" ? "page" : undefined}>
                <svg viewBox="0 0 24 24" className="kd-icon" aria-hidden="true">
                  <rect x="3" y="3" width="7" height="7" rx="1.5" />
                  <rect x="14" y="3" width="7" height="7" rx="1.5" />
                  <rect x="3" y="14" width="7" height="7" rx="1.5" />
                  <rect x="14" y="14" width="7" height="7" rx="1.5" />
                </svg>
                {expanded && <p className="kd-nav-text">Overview</p>}
              </button>
            </li>
            {/* Menu */}
            <li>
              <button className={`kd-nav-item ${activeNav === "menu" ? "active" : ""}`}
                onClick={() => setActiveNav("menu")} aria-current={activeNav === "menu" ? "page" : undefined}>
                <svg viewBox="0 0 24 24" className="kd-icon" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16" /></svg>
                {expanded && <p className="kd-nav-text">Menu</p>}
              </button>
            </li>
            {/* Orders */}
            <li>
              <button className={`kd-nav-item ${activeNav === "orders" ? "active" : ""}`}
                onClick={() => setActiveNav("orders")} aria-current={activeNav === "orders" ? "page" : undefined}>
                <svg viewBox="0 0 24 24" className="kd-icon" aria-hidden="true"><path d="M6 2h12v20H6zM6 6h12" /></svg>
                {expanded && <p className="kd-nav-text">Orders</p>}
              </button>
            </li>
            {/* Reviews */}
            <li>
              <button className={`kd-nav-item ${activeNav === "reviews" ? "active" : ""}`}
                onClick={() => setActiveNav("reviews")} aria-current={activeNav === "reviews" ? "page" : undefined}>
                <svg viewBox="0 0 24 24" className="kd-icon" aria-hidden="true">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
                {expanded && <p className="kd-nav-text">Reviews</p>}
              </button>
            </li>
            {/* Customers */}
            <li>
              <button className={`kd-nav-item ${activeNav === "customers" ? "active" : ""}`}
                onClick={() => setActiveNav("customers")} aria-current={activeNav === "customers" ? "page" : undefined}>
                <svg viewBox="0 0 24 24" className="kd-icon" aria-hidden="true">
                  <circle cx="9" cy="7" r="4" /><path d="M2 21c0-4 3.1-7 7-7h4c3.9 0 7 3 7 7" /><circle cx="19" cy="9" r="3" />
                </svg>
                {expanded && <p className="kd-nav-text">Customers</p>}
              </button>
            </li>
            {/* Reports */}
            <li>
              <button className={`kd-nav-item ${activeNav === "reports" ? "active" : ""}`}
                onClick={() => setActiveNav("reports")} aria-current={activeNav === "reports" ? "page" : undefined}>
                <svg viewBox="0 0 24 24" className="kd-icon" aria-hidden="true"><path d="M4 20V10M9 20V4M14 20v-6M19 20v-9" /></svg>
                {expanded && <p className="kd-nav-text">Reports</p>}
              </button>
            </li>
          </ul>
        </nav>
      </aside>

      {/* ── Main content ── */}
      <section className="kd-main">

        {/* Top bar */}
        <header className="kd-topbar">
          <section>
            <h1 className="kd-page-title">{PAGE_TITLES[activeNav] || activeNav.charAt(0).toUpperCase() + activeNav.slice(1)}</h1>
            <p className="kd-page-sub">{PAGE_SUBS[activeNav] || "Coming soon"}</p>
          </section>
          <ProfilePanel role="vendor" user={vendorProfile} onUpdate={handleProfileUpdate} />
        </header>

        {/* ════════════════════════════ OVERVIEW PAGE ════════════════════════════ */}
        {activeNav === "overview" && (
          <section className="ov-root" aria-label="Vendor overview">

            {/* Greeting */}
            <header className="ov-greeting">
              <h2 className="ov-greeting-title">
                Welcome back{vendorProfile?.shopName ? `, ${vendorProfile.shopName}` : ""}
              </h2>
              <p className="ov-greeting-sub">Here's what's happening with your shop.</p>
            </header>

            {ovLoading ? (
              <div className="ov-loading">
                <span className="ov-spinner" aria-hidden="true" />
                <p>Loading overview…</p>
              </div>
            ) : (
              <>
                {/* Time filter */}
                <nav className="ov-filter-row" aria-label="Time period filter">
                  {[{ k: "today", l: "Today" }, { k: "week", l: "This week" }, { k: "month", l: "This month" }, { k: "all", l: "All time" }]
                    .map(({ k, l }) => (
                      <button key={k} className={`ov-filter-btn ${ovTimeFilter === k ? "active" : ""}`}
                        onClick={() => setOvTimeFilter(k)} aria-pressed={ovTimeFilter === k}>
                        {l}
                      </button>
                    ))}
                </nav>

                {/* Stat cards */}
                <ul className="ov-stats-grid">
                  {[
                    {label: "Revenue",       value: fmtPrice(revenue),        sub: `${collected.length} collected order${collected.length !== 1 ? "s" : ""}`, accent: "#6ee7b7" },
                    {label: "Active orders",  value: activeOrders.length,       sub: "Needs attention",                                                         accent: "#f97316" },
                    {label: "Menu items",     value: menuItems.length,          sub: soldOutCount > 0 ? `${soldOutCount} sold out` : "All available",           accent: "#6366f1" },
                    {label: "Avg rating",     value: avgRating !== null ? avgRating.toFixed(1) : "—",
                      sub: avgRating !== null ? `From ${ovReviews.length} review${ovReviews.length !== 1 ? "s" : ""}` : "No reviews yet", accent: "#f59e0b" },
                  ].map(({ icon, label, value, sub, accent }) => (
                    <li key={label}>
                      <article className="ov-stat-card" style={{ "--ov-accent": accent }}>
                        <span className="ov-stat-icon">{icon}</span>
                        <div className="ov-stat-body">
                          <p className="ov-stat-value">{value}</p>
                          <p className="ov-stat-label">{label}</p>
                          <p className="ov-stat-sub">{sub}</p>
                        </div>
                        <span className="ov-stat-glow" aria-hidden="true" />
                      </article>
                    </li>
                  ))}
                </ul>

                {/* Middle row */}
                <div className="ov-mid-row">

                  {/* Recent orders */}
                  <article className="ov-card">
                    <header className="ov-card-header">
                      <h3 className="ov-card-title">Recent orders</h3>
                      <button className="ov-card-link" onClick={() => setActiveNav("orders")}>View all →</button>
                    </header>
                    {recentOrders.length === 0 ? (
                      <p className="ov-empty">No orders yet.</p>
                    ) : (
                      <ul className="ov-orders-list">
                        {recentOrders.map((order) => {
                          const meta = STATUS_META[order.status] || STATUS_META.pending;
                          return (
                            <li key={order._id} className="ov-order-row">
                              <div className="ov-order-left">
                                <p className="ov-order-id">#{(order._id || "").slice(-6).toUpperCase()}</p>
                                <p className="ov-order-items">
                                  {(order.items || []).slice(0, 2).map((i) => i.menuItem?.name || i.name || "Item").join(", ")}
                                  {(order.items || []).length > 2 && ` +${order.items.length - 2} more`}
                                </p>
                              </div>
                              <div className="ov-order-right">
                                <span className="ov-status-pill" style={{ color: meta.colour, background: meta.bg }}>{meta.label}</span>
                                <p className="ov-order-amount">{fmtPrice(order.totalAmount)}</p>
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </article>

                  {/* Status bar chart */}
                  <article className="ov-card">
                    <header className="ov-card-header">
                      <h3 className="ov-card-title">Orders by status</h3>
                      <span className="ov-card-sub">All time</span>
                    </header>
                    {ovOrders.length === 0 ? (
                      <p className="ov-empty">No orders to display.</p>
                    ) : (
                      <ul className="ov-bar-list">
                        {STATUS_ORDER.map((s) => {
                          const meta  = STATUS_META[s];
                          const count = statusCounts[s] || 0;
                          const pct   = Math.round((count / maxCount) * 100);
                          return (
                            <li key={s} className="ov-bar-row">
                              <span className="ov-bar-label">{meta.label}</span>
                              <span className="ov-bar-track">
                              <span className="ov-bar-fill" style={{
                                width: `${pct}%`,
                                background: meta.colour,
                                minWidth: count > 0 ? 4 : 0,
                                opacity: count > 0 ? 1 : 0,
                              }} />
                              </span>
                              <span className="ov-bar-count">{count}</span>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </article>
                </div>

                {/* Bottom row */}
                <div className="ov-bottom-row">

                  {/* Top sellers */}
                  <article className="ov-card">
                    <header className="ov-card-header">
                      <h3 className="ov-card-title">Top sellers</h3>
                      <span className="ov-card-sub">{ovTimeFilter === "all" ? "All time" : ovTimeFilter}</span>
                    </header>
                    {topItems.length === 0 ? (
                      <p className="ov-empty">No completed orders in this period.</p>
                    ) : (
                      <ol className="ov-top-list">
                        {topItems.map(([name, count], idx) => (
                          <li key={name} className="ov-top-row">
                            <span className="ov-top-rank" data-rank={idx + 1}>{idx + 1}</span>
                            <span className="ov-top-name">{name}</span>
                            <span className="ov-top-count">{count}×</span>
                          </li>
                        ))}
                      </ol>
                    )}
                  </article>

                  {/* Sold-out quick view */}
                  <article className="ov-card">
                    <header className="ov-card-header">
                      <h3 className="ov-card-title">Sold out items</h3>
                      <button className="ov-card-link" onClick={() => setActiveNav("menu")}>Manage →</button>
                    </header>
                    {soldOutCount === 0 ? (
                      <p className="ov-empty ov-empty--green">✓ All items are available</p>
                    ) : (
                      <ul className="ov-soldout-list">
                        {menuItems.filter((m) => m.isSoldOut).map((item) => (
                          <li key={item.id} className="ov-soldout-row">
                            {item.imageUrl
                              ? <img src={item.imageUrl} alt="" className="ov-soldout-img" aria-hidden="true" />
                              : <span className="ov-soldout-img-placeholder" aria-hidden="true">🍽️</span>
                            }
                            <div>
                              <p className="ov-soldout-name">{item.name}</p>
                              <p className="ov-soldout-cat">{item.category}</p>
                            </div>
                            <span className="ov-soldout-badge">Sold Out</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </article>

                  {/* Latest reviews */}
                  <article className="ov-card">
                    <header className="ov-card-header">
                      <h3 className="ov-card-title">Latest reviews</h3>
                      <button className="ov-card-link" onClick={() => setActiveNav("reviews")}>See all →</button>
                    </header>
                    {ovReviews.length === 0 ? (
                      <p className="ov-empty">No reviews yet.</p>
                    ) : (
                      <>
                        {avgRating !== null && (
                          <div className="ov-avg-row">
                            <span className="ov-avg-number">{avgRating.toFixed(1)}</span>
                            <StarRating value={avgRating} />
                            <span className="ov-avg-count">({ovReviews.length})</span>
                          </div>
                        )}
                        <ul className="ov-review-list">
                          {[...ovReviews]
                            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                            .slice(0, 3)
                            .map((r) => (
                              <li key={r._id} className="ov-review-row">
                                <div className="ov-review-header">
                                  <span className="ov-review-author">
                                    {r.student
                                      ? `${r.student.firstName || ""} ${r.student.lastName || ""}`.trim() || "Student"
                                      : r.studentName || "Student"}
                                  </span>
                                  <StarRating value={r.rating || 0} />
                                </div>
                                {r.comment && <p className="ov-review-comment">"{r.comment}"</p>}
                              </li>
                            ))}
                        </ul>
                      </>
                    )}
                  </article>
                </div>
              </>
            )}
          </section>
        )}

        {/* ════════════════════════════ MENU PAGE ════════════════════════════════ */}
        {activeNav === "menu" && (
          <section aria-label="Menu management">
            <header className="kd-menu-toprow">
              <h2 className="kd-section-title">Your items ({menuItems.length})</h2>
              <button className="kd-btn primary" onClick={openAddModal}>+ Add item</button>
            </header>
            <ul className="kd-menu-grid" aria-label="Menu items list">
              {menuItems.length === 0 && (
                <li className="kd-empty-state" role="status">
                  <svg className="kd-empty-icon" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M12 4v16M4 12h16" /><circle cx="12" cy="12" r="9" />
                  </svg>
                  <p>No items yet — add your first one!</p>
                </li>
              )}
              {menuItems.map((item) => (
                <li key={item.id} className={`kd-item-card ${item.isSoldOut ? "kd-item-card--sold-out" : ""}`}>
                  <div className="kd-item-image-wrap">
                    {item.imageUrl
                      ? <img src={item.imageUrl} alt={item.name} className="kd-item-image" />
                      : <figure className="kd-item-image-placeholder" aria-hidden="true">
                          <svg viewBox="0 0 24 24"><path d="M4 16l4-4 4 4 4-6 4 6" /><rect x="3" y="3" width="18" height="18" rx="3" /></svg>
                        </figure>
                    }
                    {item.isSoldOut && <span className="kd-sold-out-badge" aria-label="Sold out">Sold Out</span>}
                  </div>
                  <section className="kd-item-body">
                    <p className="kd-item-category">{item.category}</p>
                    <h3 className="kd-item-name">{item.name}</h3>
                    {item.description && <p className="kd-item-description">{item.description}</p>}
                    <p className="kd-item-price">R{Number(item.price).toFixed(2)}</p>
                    {item.dietaryTags?.length > 0 && (
                      <div className="kd-tag-row">
                        {item.dietaryTags.map((tag) => {
                          const c = DIETARY_COLOURS[tag];
                          return <span key={tag} className="kd-info-badge" style={c ? { background: c.bg, borderColor: c.border, color: c.text } : {}}>{tag}</span>;
                        })}
                      </div>
                    )}
                    {item.allergens?.length > 0 && (
                      <div className="kd-tag-row">
                        {item.allergens.map((a) => {
                          const c = ALLERGEN_COLOURS[a];
                          return <span key={a} className="kd-info-badge kd-allergen-badge" style={c ? { background: c.bg, borderColor: c.border, color: c.text } : {}}>⚠ {a}</span>;
                        })}
                      </div>
                    )}
                  </section>
                  <footer className="kd-item-actions">
                    <button
                      className={`kd-btn kd-btn--availability ${item.isSoldOut ? "kd-btn--mark-available" : "kd-btn--mark-soldout"}`}
                      onClick={() => handleToggleSoldOut(item)}
                      aria-label={item.isSoldOut ? `Mark ${item.name} as available` : `Mark ${item.name} as sold out`}>
                      {item.isSoldOut ? "Available" : "Sold Out"}
                    </button>
                    <button className="kd-btn ghost" onClick={() => openEditModal(item)} aria-label={`Edit ${item.name}`}>Edit</button>
                    <button className="kd-btn danger" onClick={() => openDeleteModal(item.id)} aria-label={`Delete ${item.name}`}>Delete</button>
                  </footer>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* ════════════════════════════ ORDERS PAGE ══════════════════════════════ */}
        {activeNav === "orders" && <OrderManagement />}

        {/* ════════════════════════════ REVIEWS PAGE ═════════════════════════════ */}
        {activeNav === "reviews" && (
          vendorId
            ? <VendorReviews vendorId={vendorId} />
            : <p style={{ color: "#475569", fontSize: "14px" }}>Vendor ID not available.</p>
        )}

        {/* ════════════════════════════ OTHER PAGES ══════════════════════════════ */}
        {activeNav !== "overview" && activeNav !== "menu" && activeNav !== "orders" && activeNav !== "reviews" && (
          <section aria-label={`${activeNav} placeholder`}>
            <p style={{ color: "#475569", fontSize: "14px" }}>
              The <strong>{activeNav}</strong> section is not yet implemented.
            </p>
          </section>
        )}

      </section>

      {/* ── Add / Edit modal ── */}
      {(modal === "add" || modal === "edit") && (
        <section className="kd-modal-overlay" role="dialog" aria-modal="true"
          onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}>
          <article className="kd-modal">{renderForm(modal === "add" ? handleSubmitAdd : handleSubmitEdit)}</article>
        </section>
      )}

      {/* ── Delete confirm modal ── */}
      {modal === "delete" && (
        <section className="kd-modal-overlay" role="dialog" aria-modal="true"
          onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}>
          <article className="kd-modal">
            <h2 className="kd-modal-title" id="delete-modal-title">Delete item</h2>
            <p className="kd-confirm-text">
              Are you sure you want to delete <strong className="kd-confirm-name">{pendingDeleteItem?.name}</strong>? This cannot be undone.
            </p>
            <footer className="kd-form-footer">
              <button className="kd-btn ghost" onClick={closeModal}>Cancel</button>
              <button className="kd-btn danger" onClick={handleConfirmDelete}>Yes, delete</button>
            </footer>
          </article>
        </section>
      )}

    </main>
  );
};

export default Vendor;
