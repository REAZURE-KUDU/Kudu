// routes/vendorRoutes.js
const express = require("express");
const router  = express.Router();

const {
  getAllVendors,
  getVendorById,
  createVendor,
  updateVendor,
  updateVendorProfile,
  uploadLogoMiddleware,
  suspendVendor,
  reinstateVendor,
  requireNotSuspended,
} = require("../controllers/vendorController");

const { verifyToken, attachVendor } = require("../middleware/auth");
const { getVendorOrders } = require("../controllers/orderController");

// Vendor's own orders — separate URL avoids any /:id route conflict
router.get("/orders", verifyToken, attachVendor, getVendorOrders);

router.get("/",     getAllVendors);
router.get("/:id",  getVendorById);
router.post("/",    createVendor);
router.put("/:id",  updateVendor);

// Profile update (vendor self-service) — handles multipart/form-data + optional logo upload
router.patch("/:id/profile", requireNotSuspended, uploadLogoMiddleware, updateVendorProfile);

// Admin: suspend / reinstate
router.patch("/:id/suspend",   suspendVendor);
router.patch("/:id/reinstate", reinstateVendor);

module.exports = router;