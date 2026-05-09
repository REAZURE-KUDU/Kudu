// middleware/auth.js
const { auth } = require("express-oauth2-jwt-bearer");
const Student = require("../models/Student");
const Vendor  = require("../models/Vendor");
const Admin = require("../models/Admin"); 

// Strip any leading protocol so AUTH0_DOMAIN works with or without "https://"
const AUTH0_DOMAIN = process.env.AUTH0_DOMAIN.replace(/^https?:\/\//, "");

exports.verifyToken = auth({
  audience:      process.env.AUTH0_AUDIENCE,
  issuerBaseURL: `https://${AUTH0_DOMAIN}`,
});

exports.attachStudent = async (req, res, next) => {
  try {
    const auth0Id = req.auth?.payload?.sub;
    if (!auth0Id) return res.status(401).json({ message: "Unauthorized" });
    const student = await Student.findOne({ authProviderId: auth0Id });
    if (!student) return res.status(404).json({ message: "Student not found" });
    req.user = student;
    next();
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.attachVendor = async (req, res, next) => {
  try {
    const auth0Id = req.auth?.payload?.sub;
    console.log("[attachVendor] sub from token:", auth0Id);
    if (!auth0Id) return res.status(401).json({ message: "Unauthorized" });

    let vendor = await Vendor.findOne({ authProviderId: auth0Id });

    // Backfill: if not found by sub, try email claim and update authProviderId
    if (!vendor) {
      const email = req.auth?.payload?.["https://kududash/email"]
        || req.auth?.payload?.email;
      if (email) {
        vendor = await Vendor.findOneAndUpdate(
          { email: email.toLowerCase() },
          { authProviderId: auth0Id },
          { new: true }
        );
      }
    }

    if (!vendor) return res.status(404).json({ message: "Vendor not found" });
    req.vendor = vendor;
    next();
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.attachAdmin = async (req, res, next) => {
  try {
    const auth0Id = req.auth?.payload?.sub;
    if (!auth0Id) return res.status(401).json({ message: "Unauthorized" });
    const admin = await Admin.findOne({ authProviderId: auth0Id });
    if (!admin) return res.status(403).json({ message: "Admin not found" });
    req.admin = admin;
    next();
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};