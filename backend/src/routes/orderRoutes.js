const express = require("express");
const router  = express.Router();
const {
  getOrders,
  getVendorOrders,
  getOrderById,
  createOrder,
  updateOrderStatus,
  getAllOrders,
  getOrdersByStudent,
  getOrdersByVendor,
} = require("../controllers/orderController");
const {
  verifyToken,
  attachStudent,
  attachVendor,
  attachAdmin,
} = require("../middleware/auth");

// ── Admin routes ──────────────────────────────────────────────────────
// IMPORTANT: specific admin sub-routes must be declared BEFORE /:id
// so Express doesn't swallow "admin" as an order ID.
router.get("/admin/all",                 getAllOrders);
router.get("/admin/student/:studentId",  verifyToken, attachAdmin, getOrdersByStudent);
router.get("/admin/vendor/:vendorId",    verifyToken, attachAdmin, getOrdersByVendor);

// ── Vendor routes ─────────────────────────────────────────────────────
router.get("/vendor", verifyToken, attachVendor, getVendorOrders);

// ── Student routes ────────────────────────────────────────────────────
// GET /api/orders      → student's own orders (used by StudentOverview)
// POST /api/orders     → create order
router.get( "/", verifyToken, attachStudent, getOrders);
router.post("/", verifyToken, attachStudent, createOrder);

// ── Shared: single order + status update ─────────────────────────────
// These must come AFTER all fixed-string routes to avoid shadowing them
router.get(   "/:id",        verifyToken, attachStudent, getOrderById);
router.patch( "/:id/status", verifyToken, attachVendor,  updateOrderStatus);

module.exports = router;