// controllers/vendorController.js
const Vendor = require("../models/Vendor");
const multer = require("multer");

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ["image/png", "image/jpeg", "image/webp"];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only PNG, JPG, and WEBP images are allowed."), false);
    }
  },
});

const uploadLogoMiddleware = upload.single("logo");

const getAllVendors = async (req, res) => {
  try {
    const vendors = await Vendor.find({ isActive: true });
    res.json(vendors);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getVendorById = async (req, res) => {
  try {
    const vendor = await Vendor.findById(req.params.id);
    if (!vendor) return res.status(404).json({ message: "Vendor not found" });
    res.json(vendor);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const createVendor = async (req, res) => {
  try {
    const vendor = new Vendor(req.body);
    await vendor.save();
    res.status(201).json(vendor);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

const updateVendor = async (req, res) => {
  try {
    const vendor = await Vendor.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!vendor) return res.status(404).json({ message: "Vendor not found" });
    res.json(vendor);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const updateVendorProfile = async (req, res) => {
  try {
    const allowedFields = ["businessName", "description", "location", "phone"];
    const updates = {};

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    });

    if (req.file) {
      const base64 = req.file.buffer.toString("base64");
      updates.logo = `data:${req.file.mimetype};base64,${base64}`;
    }

    const vendor = await Vendor.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true,
    });

    if (!vendor) return res.status(404).json({ message: "Vendor not found" });
    res.json(vendor);
  } catch (err) {
    console.error("updateVendorProfile error:", err);
    res.status(500).json({ message: err.message });
  }
};

const suspendVendor = async (req, res) => {
  try {
    const { reason } = req.body;
    if (!reason || !reason.trim()) {
      return res.status(400).json({ message: "A suspension reason is required." });
    }
    const vendor = await Vendor.findByIdAndUpdate(
      req.params.id,
      { status: "suspended", statusReason: reason.trim(), suspendedAt: new Date() },
      { new: true }
    );
    if (!vendor) return res.status(404).json({ message: "Vendor not found" });
    res.json(vendor);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const reinstateVendor = async (req, res) => {
  try {
    const vendor = await Vendor.findByIdAndUpdate(
      req.params.id,
      { status: "active", statusReason: "", suspendedAt: null },
      { new: true }
    );
    if (!vendor) return res.status(404).json({ message: "Vendor not found" });
    res.json(vendor);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const requireNotSuspended = async (req, res, next) => {
  try {
    const vendorId = req.params.id || req.query.vendor || req.body.vendor;
    if (!vendorId) return next();

    const vendor = await Vendor.findById(vendorId).select("status");
    if (!vendor) return res.status(404).json({ message: "Vendor not found" });

    if (vendor.status === "suspended") {
      return res.status(403).json({
        message: "Your account has been suspended. Please contact support.",
      });
    }

    next();
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  getAllVendors,
  getVendorById,
  createVendor,
  updateVendor,
  updateVendorProfile,
  uploadLogoMiddleware,
  suspendVendor,
  reinstateVendor,
  requireNotSuspended,
};