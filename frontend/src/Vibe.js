// Vibe.js
import React, { useState, useEffect } from "react";
import "./Vibe.css";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth0 } from "@auth0/auth0-react";
import { useNavigate } from "react-router-dom";

const Vibe = () => {
  const { user, getAccessTokenSilently, isLoading, isAuthenticated } = useAuth0();
  const navigate = useNavigate();

  const [selectedRole, setSelectedRole]     = useState(null);
  const [showAdminInput, setShowAdminInput] = useState(false);
  const [adminCode, setAdminCode]           = useState("");
  const [vendorForm, setVendorForm]         = useState({
    businessName: "", location: "", phone: "", description: "",
  });
  const [error, setError]     = useState("");
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(true);

  // ── Sync user after Auth0 redirect ────────────────────────────
  useEffect(() => {
    if (isLoading || !isAuthenticated) return;

    const syncUser = async () => {
      try {
        const token = await getAccessTokenSilently();

        const res = await fetch("/api/auth/sync", {
          method: "POST",
          headers: {
            "Content-Type":  "application/json",
            "Authorization": `Bearer ${token}`,
          },
          body: JSON.stringify({
            sub:         user.sub,
            email:       user.email,
            given_name:  user.given_name  || user.name?.split(" ")[0] || "",
            family_name: user.family_name || user.name?.split(" ")[1] || "",
            picture:     user.picture     || "",
          }),
        });

        // ── Guard: ensure we got JSON back ─────────────────────
        if (!res.ok || !res.headers.get("content-type")?.includes("application/json")) {
          const raw = await res.text();
          console.error("Sync: unexpected response →", raw.slice(0, 300));
          setSyncing(false);
          return;
        }

        const data = await res.json();

        if (!data.isNewUser) {
          // Returning user — go straight to their dashboard
          navigate(`/dashboard/${data.role}`, {
            state: {
              ownerFirstName: data.ownerFirstName || data.firstName || "",
              ownerLastName:  data.ownerLastName  || data.lastName  || "",
              vendorId:       data.userId || "",
            },
          });
          return;
        }

        // New user — show the role picker
        setSyncing(false);

      } catch (err) {
        console.error("Sync failed:", err);
        setSyncing(false);
      }
    };

    syncUser();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, isAuthenticated]);

  // ── Role selection ─────────────────────────────────────────────
  const handleRoleClick = (role) => {
    setSelectedRole(role);
    setError("");
    setShowAdminInput(role === "admin");
  };

  // ── Submit ─────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!selectedRole) { setError("Please pick a role first"); return; }
    if (selectedRole === "admin" && !adminCode.trim()) {
      setError("Please enter the admin code"); return;
    }
    if (selectedRole === "vendor" && !vendorForm.businessName.trim()) {
      setError("Business name is required"); return;
    }

    setLoading(true);
    setError("");

    try {
      const token = await getAccessTokenSilently();

      const body = {
        sub:         user.sub,
        email:       user.email,
        given_name:  user.given_name  || user.name?.split(" ")[0] || "",
        family_name: user.family_name || user.name?.split(" ")[1] || "",
        picture:     user.picture     || "",
        ...(selectedRole === "admin"  && { adminCode }),
        ...(selectedRole === "vendor" && vendorForm),
      };

      const res = await fetch(`/api/auth/register/${selectedRole}`, {
        method: "POST",
        headers: {
          "Content-Type":  "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      // ── Guard: ensure we got JSON back ──────────────────────
      if (!res.headers.get("content-type")?.includes("application/json")) {
        const raw = await res.text();
        console.error("Register: unexpected response →", raw.slice(0, 300));
        setError("Server error, please try again");
        return;
      }

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Something went wrong");
        return;
      }

      // Navigate to dashboard
      navigate(`/dashboard/${selectedRole}`, {
        state: {
          ownerFirstName: data.ownerFirstName || body.given_name  || "",
          ownerLastName:  data.ownerLastName  || body.family_name || "",
          vendorId:       data.userId || "",
        },
      });

    } catch (err) {
      setError("Network error, please try again");
    } finally {
      setLoading(false);
    }
  };

  // ── Show nothing while syncing ─────────────────────────────────
  if (syncing) {
    return (
      <motion.main
        className="vibe"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <p style={{ color: "#e2e8f0", fontSize: "16px" }}>Loading...</p>
      </motion.main>
    );
  }

  return (
    <motion.main
      className="vibe"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.5 }}
    >
      <section className="vibe__card">
        <h1 className="vibe__title">Pick Your Vibe</h1>
        <p className="vibe__subtitle">What brings you to KuduDash?</p>

        <section className="vibe__options">

          {/* Student */}
          <article
            className={`vibe__option ${selectedRole === "student" ? "vibe__option--selected" : ""}`}
            onClick={() => handleRoleClick("student")}
          >
            <h2>Student</h2>
            <p>Order food, skip queues</p>
          </article>

          {/* Vendor */}
          <article
            className={`vibe__option ${selectedRole === "vendor" ? "vibe__option--selected" : ""}`}
            onClick={() => handleRoleClick("vendor")}
          >
            <h2>Vendor</h2>
            <p>Serve food, make bank</p>

            <AnimatePresence>
              {selectedRole === "vendor" && (
                <motion.div
                  className="vibe__vendor-fields"
                  initial={{ opacity: 0, height: 0, marginTop: 0 }}
                  animate={{ opacity: 1, height: "auto", marginTop: 12 }}
                  exit={{ opacity: 0, height: 0, marginTop: 0 }}
                  transition={{ duration: 0.4 }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <input type="text" placeholder="Business name *"
                    className="vibe__admin-input" value={vendorForm.businessName}
                    onChange={(e) => setVendorForm({ ...vendorForm, businessName: e.target.value })} />
                  <input type="text" placeholder="Location (e.g. Matrix Food Court, Shop 3)"
                    className="vibe__admin-input" value={vendorForm.location}
                    onChange={(e) => setVendorForm({ ...vendorForm, location: e.target.value })} />
                  <input type="text" placeholder="Phone number"
                    className="vibe__admin-input" value={vendorForm.phone}
                    onChange={(e) => setVendorForm({ ...vendorForm, phone: e.target.value })} />
                  <input type="text" placeholder="Business description"
                    className="vibe__admin-input" value={vendorForm.description}
                    onChange={(e) => setVendorForm({ ...vendorForm, description: e.target.value })} />
                </motion.div>
              )}
            </AnimatePresence>
          </article>

          {/* Admin */}
          <article
            className={`vibe__option ${selectedRole === "admin" ? "vibe__option--selected" : ""}`}
            onClick={() => handleRoleClick("admin")}
          >
            <h2>Admin</h2>
            <p>Run the show</p>

            <AnimatePresence>
              {showAdminInput && (
                <motion.input
                  type="password" placeholder="Enter admin code"
                  className="vibe__admin-input" value={adminCode}
                  onChange={(e) => setAdminCode(e.target.value)}
                  initial={{ opacity: 0, height: 0, marginTop: 0 }}
                  animate={{ opacity: 1, height: 40, marginTop: 10 }}
                  exit={{ opacity: 0, height: 0, marginTop: 0 }}
                  transition={{ duration: 0.4 }}
                  onClick={(e) => e.stopPropagation()}
                />
              )}
            </AnimatePresence>
          </article>

        </section>

        <AnimatePresence>
          {error && (
            <motion.p className="vibe__error"
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
            >
              {error}
            </motion.p>
          )}
        </AnimatePresence>

        <button
          className="vibe__button"
          onClick={handleSubmit}
          disabled={loading || !selectedRole}
        >
          {loading ? "Hold on..." : "Let's Go!"}
        </button>

      </section>
    </motion.main>
  );
};

export default Vibe;