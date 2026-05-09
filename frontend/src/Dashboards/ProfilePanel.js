// ProfilePanel.js
import React, { useState, useRef, useEffect } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import "./ProfilePanel.css";

/**
 * ProfilePanel
 *
 * Props:
 *   role      – "student" | "vendor" | "admin"
 *   user      – the profile object fetched from your DB
 *   onUpdate  – async (FormData) => void   [vendor only, can be omitted for other roles]
 */
export default function ProfilePanel({ role, user, onUpdate }) {
  const { logout, user: auth0User } = useAuth0();

  const [open, setOpen]               = useState(false);
  const [editing, setEditing]         = useState(false);
  const [saving, setSaving]           = useState(false);
  const [saveError, setSaveError]     = useState("");
  const [logoPreview, setLogoPreview] = useState(null);
  const [logoFile, setLogoFile]       = useState(null);
  const [form, setForm]               = useState({});

  const panelRef     = useRef(null);
  const fileInputRef = useRef(null);

  // Sync form when user data arrives / changes
  useEffect(() => {
    if (user) {
      setForm({
        businessName: user.businessName || "",
        description:  user.description  || "",
        location:     user.location     || "",
        phone:        user.phone        || "",
      });
      setLogoPreview(user.logo || null);
    }
  }, [user]);

  // Close panel when clicking outside
  useEffect(() => {
    const handleOutside = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setOpen(false);
        setEditing(false);
        setSaveError("");
      }
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  // ── Avatar helpers ──────────────────────────────────────────────────

  const getInitials = () => {
    // If DB user is loaded, use their name
    if (user) {
      if (role === "vendor") {
        return (user.businessName || "V").slice(0, 2).toUpperCase();
      }
      const f = (user.firstName || "").charAt(0);
      const l = (user.lastName  || "").charAt(0);
      const initials = `${f}${l}`.toUpperCase();
      if (initials.trim()) return initials;
    }
    // Fallback to Auth0 user name while DB data is still loading
    if (auth0User?.name) {
      return auth0User.name
        .split(" ")
        .slice(0, 2)
        .map((w) => w[0].toUpperCase())
        .join("");
    }
    return role ? role[0].toUpperCase() : "?";
  };

  // Vendors use their logo as the avatar when available
  const avatarImg = role === "vendor" && user ? (user.logo || null) : null;

  const displayName = user
    ? role === "vendor"
      ? user.businessName
      : `${user.firstName || ""} ${user.lastName || ""}`.trim()
    : auth0User?.name || "";

  const emailDisplay = user?.email || auth0User?.email || "";

  // ── Event handlers ──────────────────────────────────────────────────

  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  };

  const handleChange = (e) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSave = async () => {
    setSaving(true);
    setSaveError("");
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      if (logoFile) fd.append("logo", logoFile);
      await onUpdate(fd);
      setEditing(false);
      setLogoFile(null);
    } catch (err) {
      setSaveError(err.message || "Failed to save changes.");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditing(false);
    setLogoFile(null);
    setSaveError("");
    setLogoPreview(user?.logo || null);
    setForm({
      businessName: user?.businessName || "",
      description:  user?.description  || "",
      location:     user?.location     || "",
      phone:        user?.phone        || "",
    });
  };

  const handleLogout = () =>
    logout({ logoutParams: { returnTo: window.location.origin } });

  // ── Sub-views ────────────────────────────────────────────────────────

  const ReadOnlySimple = () => (
    <ul className="pp-fields">
      <li className="pp-field">
        <span className="pp-label">First Name</span>
        <span className="pp-value">{user?.firstName || "—"}</span>
      </li>
      <li className="pp-field">
        <span className="pp-label">Last Name</span>
        <span className="pp-value">{user?.lastName || "—"}</span>
      </li>
      <li className="pp-field">
        <span className="pp-label">Email</span>
        <span className="pp-value">{user?.email || "—"}</span>
      </li>
    </ul>
  );

  const ReadOnlyVendor = () => (
    <ul className="pp-fields">
      {(user?.logo || logoPreview) && (
        <li className="pp-field pp-field--logo">
          <img
            src={logoPreview || user.logo}
            alt={user.businessName}
            className="pp-logo-display"
          />
        </li>
      )}
      <li className="pp-field">
        <span className="pp-label">Business</span>
        <span className="pp-value">{user?.businessName || "—"}</span>
      </li>
      <li className="pp-field">
        <span className="pp-label">Description</span>
        <span className="pp-value pp-value--desc">{user?.description || "—"}</span>
      </li>
      <li className="pp-field">
        <span className="pp-label">Location</span>
        <span className="pp-value">{user?.location || "—"}</span>
      </li>
      <li className="pp-field">
        <span className="pp-label">Owner</span>
        <span className="pp-value">
          {user?.ownerFirstName} {user?.ownerLastName}
        </span>
      </li>
      <li className="pp-field">
        <span className="pp-label">Email</span>
        <span className="pp-value">{user?.email || "—"}</span>
      </li>
      <li className="pp-field">
        <span className="pp-label">Phone</span>
        <span className="pp-value">{user?.phone || "—"}</span>
      </li>
    </ul>
  );

  const EditVendor = () => (
    <div className="pp-edit-form">

      {/* Logo upload */}
      <div className="pp-logo-upload-wrap">
        <button
          type="button"
          className="pp-logo-upload-btn"
          onClick={() => fileInputRef.current?.click()}
          aria-label="Change business logo"
        >
          {logoPreview ? (
            <img src={logoPreview} alt="Logo preview" className="pp-logo-preview" />
          ) : (
            <div className="pp-logo-placeholder">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              <span>Upload Logo</span>
            </div>
          )}
          <div className="pp-logo-overlay">Change</div>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          style={{ display: "none" }}
          onChange={handleLogoChange}
        />
        <p className="pp-logo-hint">PNG, JPG or WEBP</p>
      </div>

      <label className="pp-input-group">
        <span>Business Name</span>
        <input
          name="businessName"
          value={form.businessName}
          onChange={handleChange}
          placeholder="e.g. The Kudu Kitchen"
        />
      </label>

      <label className="pp-input-group">
        <span>Description</span>
        <textarea
          name="description"
          value={form.description}
          onChange={handleChange}
          rows={3}
          placeholder="Tell students what you sell…"
        />
      </label>

      <label className="pp-input-group">
        <span>Location</span>
        <input
          name="location"
          value={form.location}
          onChange={handleChange}
          placeholder="e.g. Matrix Food Court, Shop 3"
        />
      </label>

      <label className="pp-input-group">
        <span>Phone</span>
        <input
          name="phone"
          value={form.phone}
          onChange={handleChange}
          placeholder="+27 71 000 0000"
        />
      </label>

      {saveError && <p className="pp-error" role="alert">{saveError}</p>}

      <div className="pp-edit-actions">
        <button className="pp-btn-cancel" onClick={handleCancel} disabled={saving}>
          Cancel
        </button>
        <button className="pp-btn-save" onClick={handleSave} disabled={saving}>
          {saving ? "Saving…" : "Save changes"}
        </button>
      </div>
    </div>
  );

  // ── Main render ──────────────────────────────────────────────────────

  return (
    <div className="pp-wrapper" ref={panelRef}>

      {/* Avatar / trigger button — always rendered, even before DB data loads */}
      <button
        className="pp-avatar-btn"
        onClick={() => { setOpen((o) => !o); setEditing(false); }}
        aria-label="Open profile panel"
        aria-expanded={open}
      >
        {avatarImg ? (
          <img src={avatarImg} alt={displayName} className="pp-avatar-img" />
        ) : (
          <span className="pp-avatar-initials">{getInitials()}</span>
        )}
      </button>

      {/* Dropdown panel — only opens once clicked */}
      {open && (
        <div className={`pp-panel pp-panel--${role}`} role="dialog" aria-label="Profile">

          <div className="pp-header">
            <span className="pp-role-badge">{role}</span>
            <p className="pp-display-name">{displayName || "—"}</p>
            <p className="pp-email">{emailDisplay}</p>
          </div>

          <div className="pp-body">
            {/* Show a loading message if DB data hasn't arrived yet */}
            {!user ? (
              <p style={{ color: "#64748b", fontSize: "13px", textAlign: "center", padding: "20px 0" }}>
                Loading profile…
              </p>
            ) : role === "vendor" ? (
              editing ? (
                <EditVendor />
              ) : (
                <>
                  <ReadOnlyVendor />
                  <button
                    className="pp-btn-edit"
                    onClick={() => setEditing(true)}
                  >
                    Edit Profile
                  </button>
                </>
              )
            ) : (
              <ReadOnlySimple />
            )}
          </div>

          <div className="pp-footer">
            <button className="pp-logout-btn" onClick={handleLogout}>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              Log out
            </button>
          </div>

        </div>
      )}

    </div>
  );
}