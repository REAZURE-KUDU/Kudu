// routes/auth.routes.js
const express = require("express");
const router  = express.Router();
const Student = require("../models/Student");
const Vendor  = require("../models/Vendor");
const Admin   = require("../models/Admin");

// ── POST /api/auth/sync ────────────────────────────────────────────────────
router.post("/sync", async (req, res) => {
  try {
    const { sub, email, given_name, family_name, picture } = req.body;

    const normalizedEmail = email.toLowerCase();

    const [student, vendor, admin] = await Promise.all([
      Student.findOne({ $or: [{ authProviderId: sub }, { email: normalizedEmail }] }),
      Vendor.findOne({  $or: [{ authProviderId: sub }, { email: normalizedEmail }] }),
      Admin.findOne({   $or: [{ authProviderId: sub }, { email: normalizedEmail }] }),
    ]);

    const existingUser = student || vendor || admin;
    const role = student ? "student" : vendor ? "vendor" : admin ? "admin" : null;

    if (existingUser) {
      // Backfill authProviderId if matched by email but sub is missing/different
      if (existingUser.authProviderId !== sub) {
        const Model = student ? Student : vendor ? Vendor : Admin;
        await Model.findByIdAndUpdate(existingUser._id, { authProviderId: sub });
      }

      return res.json({
        isNewUser: false,
        role,
        userId: existingUser._id,
        ...(vendor && {
          vendorStatus:   vendor.status,
          ownerFirstName: vendor.ownerFirstName,
          ownerLastName:  vendor.ownerLastName,
        }),
        ...(student && {
          firstName: student.firstName,
          lastName:  student.lastName,
        }),
        ...(admin && {
          firstName: admin.firstName,
          lastName:  admin.lastName,
        }),
      });
    }

    return res.json({
      isNewUser: true,
      role: null,
      tempProfile: {
        sub,
        email: normalizedEmail,
        given_name:  given_name  || email.split("@")[0],
        family_name: family_name || "",
        picture:     picture     || "",
      },
    });

  } catch (err) {
    console.error("Sync error:", err);
    res.status(500).json({ error: "Failed to sync user" });
  }
});

// ── POST /api/auth/register/student ───────────────────────────────────────
router.post("/register/student", async (req, res) => {
  try {
    const { sub, email, given_name, family_name, picture } = req.body;

    const normalizedEmail = email.toLowerCase();

    const existing = await Student.findOne({
      $or: [{ authProviderId: sub }, { email: normalizedEmail }],
    });
    if (existing) {
      return res.status(409).json({ error: "Student already registered" });
    }

    const student = await Student.create({
      authProviderId: sub,
      email: normalizedEmail,
      firstName: given_name,
      lastName: family_name,
      profilePhoto: picture || "",
    });

    res.status(201).json({ role: "student", userId: student._id });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ error: "Email already registered" });
    }
    console.error("Student register error:", err);
    res.status(500).json({ error: "Failed to register student" });
  }
});

// ── POST /api/auth/register/vendor ────────────────────────────────────────
router.post("/register/vendor", async (req, res) => {
  try {
    const {
      sub, email, given_name, family_name,
      businessName, location, phone, description,
    } = req.body;

    if (!businessName) {
      return res.status(400).json({ error: "Business name is required" });
    }

    const normalizedEmail = email.toLowerCase();

    const existing = await Vendor.findOne({
      $or: [{ authProviderId: sub }, { email: normalizedEmail }],
    });
    if (existing) {
      return res.status(409).json({ error: "Vendor already registered" });
    }

    const vendor = await Vendor.create({
      authProviderId: sub,
      email: normalizedEmail,
      ownerFirstName: given_name,
      ownerLastName: family_name,
      businessName,
      location: location || "",
      phone: phone || "",
      description: description || "",
      status: "pending",
    });

    res.status(201).json({
      role: "vendor",
      userId: vendor._id,
      vendorStatus: vendor.status,
      ownerFirstName: vendor.ownerFirstName,
      ownerLastName: vendor.ownerLastName,
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ error: "Email already registered" });
    }
    console.error("Vendor register error:", err);
    res.status(500).json({ error: "Failed to register vendor" });
  }
});

// ── POST /api/auth/register/admin ─────────────────────────────────────────
router.post("/register/admin", async (req, res) => {
  try {
    const { sub, email, given_name, family_name, adminCode } = req.body;

    if (!adminCode) {
      return res.status(400).json({ error: "Admin code is required" });
    }
    if (adminCode !== process.env.ADMIN_SECRET_CODE) {
      return res.status(403).json({ error: "Invalid admin code" });
    }

    const normalizedEmail = email.toLowerCase();

    const existing = await Admin.findOne({
      $or: [{ authProviderId: sub }, { email: normalizedEmail }],
    });
    if (existing) {
      return res.status(409).json({ error: "Admin already registered" });
    }

    const admin = await Admin.create({
      authProviderId: sub,
      email: normalizedEmail,
      firstName: given_name,
      lastName: family_name,
    });

    res.status(201).json({ role: "admin", userId: admin._id });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ error: "Email already registered" });
    }
    console.error("Admin register error:", err);
    res.status(500).json({ error: "Failed to register admin" });
  }
});

module.exports = router;