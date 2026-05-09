// Dashboards/Vendor.js
import React, { useState, useRef, useEffect } from "react";
import "./Vendor.css";
import { useLocation } from "react-router-dom";
import { useAuth0 } from "@auth0/auth0-react";
import ProfilePanel from "./ProfilePanel";
import OrderManagement from "./OrderManagement";
import VendorReviews from "../VendorReviews";
import API_BASE_URL from '../api';

const CATEGORIES = ["Food", "Drink", "Snack", "Dessert", "Other"];

const EMPTY_FORM = {
  name: "",
  description: "",
  priceCents: 0,
  category: "Food",
  imageUrl: "",
};

const Vendor = () => {
  const { getAccessTokenSilently, logout } = useAuth0();
  const location = useLocation();
  const vendorId = location.state?.vendorId || "";

  const [expanded,       setExpanded]       = useState(false);
  const [activeNav,      setActiveNav]      = useState("menu");
  const [menuItems,      setMenuItems]      = useState([]);
  const [vendorProfile,  setVendorProfile]  = useState(null);

  const [modal,          setModal]          = useState(null);
  const [formData,       setFormData]       = useState(EMPTY_FORM);
  const [editingId,      setEditingId]      = useState(null);
  const [pendingDeleteId,setPendingDeleteId]= useState(null);
  const [formError,      setFormError]      = useState("");

   const [isSuspended, setIsSuspended] = useState(false);

  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchMenuItems();
    fetchVendorProfile();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getToken = () =>
    getAccessTokenSilently({
      authorizationParams: { audience: process.env.REACT_APP_AUTH0_AUDIENCE },
    });

  // ── Data fetchers ────────────────────────────────────────────────────

  const fetchVendorProfile = async () => {
    if (!vendorId) return;
    try {
      const token = await getToken();
      const res = await fetch(`${API_BASE_URL}/api/vendors/${vendorId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch vendor profile");
      const data = await res.json();
      setVendorProfile(data);
      if (data.status === "suspended") setIsSuspended(true);
    } catch (err) {
      console.error("Error fetching vendor profile:", err);
    }
  };

  const fetchMenuItems = async () => {
    if (!vendorId) return;
    try {
      const token = await getToken();
      const res = await fetch(`${API_BASE_URL}/api/menu?vendor=${vendorId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setMenuItems(data.map((item) => ({ ...item, id: item._id })));
    } catch (err) {
      console.error("Error fetching menu items:", err);
    }
  };

  // ── Profile update handler ───────────────────────────────────────────

  const handleProfileUpdate = async (formData) => {
    const token = await getToken();
    const res = await fetch(`${API_BASE_URL}/api/vendors/${vendorId}/profile`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || "Update failed");
    }
    const updated = await res.json();
    setVendorProfile(updated);
  };

  // ── Menu modal helpers ───────────────────────────────────────────────

  const openAddModal = () => {
    setFormData(EMPTY_FORM);
    setEditingId(null);
    setFormError("");
    setModal("add");
  };

  const openEditModal = (item) => {
    setFormData({
      name:        item.name        || "",
      description: item.description || "",
      priceCents:  Math.round((Number(item.price) || 0) * 100),
      category:    item.category    || "Food",
      imageUrl:    item.imageUrl    || "",
    });
    setEditingId(item.id);
    setFormError("");
    setModal("edit");
  };

  const openDeleteModal = (id) => {
    setPendingDeleteId(id);
    setModal("delete");
  };

  const closeModal = () => {
    setModal(null);
    setEditingId(null);
    setPendingDeleteId(null);
    setFormError("");
  };

  const handleFieldChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handlePriceKeyDown = (e) => {
    const allowed = ["Backspace", "Tab", "ArrowLeft", "ArrowRight"];
    if (allowed.includes(e.key)) {
      if (e.key === "Backspace") {
        e.preventDefault();
        setFormData((prev) => ({ ...prev, priceCents: Math.floor(prev.priceCents / 10) }));
      }
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
    e.preventDefault();
    setFormError("");
    try {
      const token = await getToken();
      const { priceCents, ...rest } = formData;
      const res = await fetch(`${API_BASE_URL}/api/menu`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...rest, price: priceCents / 100, vendor: vendorId }),
      });
      if (!res.ok) { const data = await res.json(); setFormError(data.message || "Something went wrong"); return; }
      await fetchMenuItems();
      closeModal();
    } catch (err) {
      console.error("Error adding menu item:", err);
      setFormError("Something went wrong. Please try again.");
    }
  };

  const handleSubmitEdit = async (e) => {
    e.preventDefault();
    setFormError("");
    try {
      const token = await getToken();
      const { priceCents, ...rest } = formData;
      const res = await fetch(`${API_BASE_URL}/api/menu/${editingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...rest, price: priceCents / 100 }),
      });
      if (!res.ok) { const data = await res.json(); setFormError(data.message || "Something went wrong"); return; }
      await fetchMenuItems();
      closeModal();
    } catch (err) {
      console.error("Error updating menu item:", err);
      setFormError("Something went wrong. Please try again.");
    }
  };

  const handleConfirmDelete = async () => {
    try {
      const token = await getToken();
      const res = await fetch(`${API_BASE_URL}/api/menu/${pendingDeleteId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(await res.text());
      await fetchMenuItems();
      closeModal();
    } catch (err) {
      console.error("Error deleting menu item:", err);
    }
  };

  const pendingDeleteItem = menuItems.find((item) => item.id === pendingDeleteId);

  /* ── Shared form markup ── */
  const renderForm = (onSubmit) => (
    <form className="kd-form" onSubmit={onSubmit} noValidate>
      <fieldset style={{ border: "none", display: "contents" }}>
        <legend className="kd-modal-title">
          {modal === "add" ? "Add menu item" : "Edit menu item"}
        </legend>

        {formError && <p className="kd-form-error" role="alert">{formError}</p>}

        <section className="kd-field">
          <label className="kd-label" htmlFor="item-name">Name</label>
          <input id="item-name" className="kd-input" type="text" name="name"
            value={formData.name} onChange={handleFieldChange}
            placeholder="e.g. Mango Smoothie" required autoComplete="off" />
        </section>

        <section className="kd-field">
          <label className="kd-label" htmlFor="item-description">Description</label>
          <textarea id="item-description" className="kd-textarea" name="description"
            value={formData.description} onChange={handleFieldChange}
            placeholder="A short description of the item…" />
        </section>

        <section className="kd-field">
          <label className="kd-label" htmlFor="item-price">Price (R)</label>
          <input id="item-price" className="kd-input" type="text" inputMode="numeric" name="price"
            value={(formData.priceCents / 100).toFixed(2)}
            onKeyDown={handlePriceKeyDown} onChange={() => {}} placeholder="0.00" required />
        </section>

        <section className="kd-field">
          <label className="kd-label" htmlFor="item-category">Category</label>
          <select id="item-category" className="kd-select" name="category"
            value={formData.category} onChange={handleFieldChange}>
            {CATEGORIES.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
          </select>
        </section>

        <section className="kd-field">
          <label className="kd-label" htmlFor="item-image">Photo</label>
          <label className="kd-upload-area" htmlFor="item-image">
            {formData.imageUrl ? (
              <img src={formData.imageUrl} alt="Preview" className="kd-upload-preview" />
            ) : (
              <>
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M4 16l4-4 4 4 4-6 4 6" />
                  <rect x="3" y="3" width="18" height="18" rx="3" />
                </svg>
                <p>Click to upload a photo</p>
                <small className="kd-upload-hint">PNG, JPG or WEBP — max 5 MB</small>
              </>
            )}
          </label>
          <input id="item-image" className="kd-file-input" type="file" accept="image/*"
            ref={fileInputRef} onChange={handleImageChange} />
        </section>

        <footer className="kd-form-footer">
          <button type="button" className="kd-btn ghost" onClick={closeModal}>Cancel</button>
          <button type="submit" className="kd-btn primary">
            {modal === "add" ? "Add item" : "Save changes"}
          </button>
        </footer>
      </fieldset>
    </form>
  );

  /* ── Render ── */
  return (
    <main className="kd-app">

      {isSuspended && (
        <section
          className="kd-modal-overlay"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="suspended-title"
          style={{ zIndex: 9999 }}
        >
          <article className="kd-modal" style={{ textAlign: "center", maxWidth: 420 }}>
            <h2 className="kd-modal-title" id="suspended-title">Account suspended</h2>
            <p className="kd-confirm-text">
              Your vendor account has been suspended. You cannot access the dashboard
              at this time. Please contact support if you believe this is a mistake.
            </p>
            <footer className="kd-form-footer" style={{ justifyContent: "center" }}>
              <button className="kd-btn danger" onClick={() => logout({ returnTo: window.location.origin })}>
                Sign out
              </button>
            </footer>
          </article>
        </section>
      )}

      {/* SIDEBAR */}
      <aside
        className={`kd-sidebar ${expanded ? "expanded" : ""}`}
        onMouseEnter={() => setExpanded(true)}
        onMouseLeave={() => setExpanded(false)}
        aria-label="Vendor navigation"
      >
        <header className="kd-logo" aria-label="KuduDash vendor portal">
          {expanded ? "KuduDash" : "KD"}
        </header>
        <nav className="kd-nav" aria-label="Main menu">
          <ul>
            <li>
              <button className={`kd-nav-item ${activeNav === "menu" ? "active" : ""}`}
                onClick={() => setActiveNav("menu")} aria-current={activeNav === "menu" ? "page" : undefined}>
                <svg viewBox="0 0 24 24" className="kd-icon" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16" /></svg>
                {expanded && <p className="kd-nav-text">Menu</p>}
              </button>
            </li>
            <li>
              <button className={`kd-nav-item ${activeNav === "orders" ? "active" : ""}`}
                onClick={() => setActiveNav("orders")} aria-current={activeNav === "orders" ? "page" : undefined}>
                <svg viewBox="0 0 24 24" className="kd-icon" aria-hidden="true"><path d="M6 2h12v20H6zM6 6h12" /></svg>
                {expanded && <p className="kd-nav-text">Orders</p>}
              </button>
            </li>
            <li>
              <button className={`kd-nav-item ${activeNav === "reviews" ? "active" : ""}`}
                onClick={() => setActiveNav("reviews")} aria-current={activeNav === "reviews" ? "page" : undefined}>
                <svg viewBox="0 0 24 24" className="kd-icon" aria-hidden="true">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
                {expanded && <p className="kd-nav-text">Reviews</p>}
              </button>
            </li>
            <li>
              <button className={`kd-nav-item ${activeNav === "customers" ? "active" : ""}`}
                onClick={() => setActiveNav("customers")} aria-current={activeNav === "customers" ? "page" : undefined}>
                <svg viewBox="0 0 24 24" className="kd-icon" aria-hidden="true">
                  <circle cx="9" cy="7" r="4" /><path d="M2 21c0-4 3.1-7 7-7h4c3.9 0 7 3 7 7" /><circle cx="19" cy="9" r="3" />
                </svg>
                {expanded && <p className="kd-nav-text">Customers</p>}
              </button>
            </li>
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

      {/* MAIN CONTENT */}
      <section className="kd-main">

        {/* TOP BAR */}
        <header className="kd-topbar">
          <section>
            <h1 className="kd-page-title">
              {activeNav === "orders"  ? "Orders"
                : activeNav === "reviews" ? "Reviews"
                : activeNav.charAt(0).toUpperCase() + activeNav.slice(1)}
            </h1>
            <p className="kd-page-sub">
              {activeNav === "menu"     ? "Manage what you sell"
                : activeNav === "orders"  ? "Manage and advance customer orders"
                : activeNav === "reviews" ? "See what your customers are saying"
                : "Coming soon"}
            </p>
          </section>

          <ProfilePanel
            role="vendor"
            user={vendorProfile}
            onUpdate={handleProfileUpdate}
          />
        </header>

        {/* MENU PAGE */}
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
                <li key={item.id} className="kd-item-card">
                  {item.imageUrl ? (
                    <img src={item.imageUrl} alt={item.name} className="kd-item-image" />
                  ) : (
                    <figure className="kd-item-image-placeholder" aria-hidden="true">
                      <svg viewBox="0 0 24 24"><path d="M4 16l4-4 4 4 4-6 4 6" /><rect x="3" y="3" width="18" height="18" rx="3" /></svg>
                    </figure>
                  )}
                  <section className="kd-item-body">
                    <p className="kd-item-category">{item.category}</p>
                    <h3 className="kd-item-name">{item.name}</h3>
                    {item.description && <p className="kd-item-description">{item.description}</p>}
                    <p className="kd-item-price">R{Number(item.price).toFixed(2)}</p>
                  </section>
                  <footer className="kd-item-actions">
                    <button className="kd-btn ghost" onClick={() => openEditModal(item)} aria-label={`Edit ${item.name}`}>Edit</button>
                    <button className="kd-btn danger" onClick={() => openDeleteModal(item.id)} aria-label={`Delete ${item.name}`}>Delete</button>
                  </footer>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* ORDERS PAGE */}
        {activeNav === "orders" && <OrderManagement />}

        {/* REVIEWS PAGE — UAT 4 & 5 */}
        {activeNav === "reviews" && (
          vendorId
            ? <VendorReviews vendorId={vendorId} />
            : <p style={{ color: "#475569", fontSize: "14px" }}>Vendor ID not available.</p>
        )}

        {/* OTHER PAGES */}
        {activeNav !== "menu" && activeNav !== "orders" && activeNav !== "reviews" && (
          <section aria-label={`${activeNav} placeholder`}>
            <p style={{ color: "#475569", fontSize: "14px" }}>
              The <strong>{activeNav}</strong> section is not yet implemented.
            </p>
          </section>
        )}
      </section>

      {/* ADD / EDIT MODAL */}
      {(modal === "add" || modal === "edit") && (
        <section className="kd-modal-overlay" role="dialog" aria-modal="true"
          onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}>
          <article className="kd-modal">
            {modal === "add" ? renderForm(handleSubmitAdd) : renderForm(handleSubmitEdit)}
          </article>
        </section>
      )}

      {/* DELETE CONFIRM MODAL */}
      {modal === "delete" && (
        <section className="kd-modal-overlay" role="dialog" aria-modal="true"
          onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}>
          <article className="kd-modal">
            <h2 className="kd-modal-title" id="delete-modal-title">Delete item</h2>
            <p className="kd-confirm-text">
              Are you sure you want to delete{" "}
              <strong className="kd-confirm-name">{pendingDeleteItem?.name}</strong>?
              This action cannot be undone.
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