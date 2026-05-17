//menuItemRoutes.js
const express = require("express");
const router = express.Router();
const {
  getMenuItems,
  getMenuItemById,
  getAllMenuItemsByVendor,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
  toggleSoldOut,
} = require("../controllers/menuItemController");
const { verifyToken, attachVendor } = require("../middleware/auth");

// ⚠️  Specific routes MUST come before /:id param routes

// Public
router.get("/vendor/:vendorId", getAllMenuItemsByVendor);
router.get("/",    getMenuItems);
router.get("/:id", getMenuItemById);

// Vendor-protected writes
// NOTE: requireNotSuspended is NOT used on any of these routes because it
// resolves the vendor using req.params.id — which on /:id routes is the
// MENU ITEM id, not the vendor id. The suspension check is done inside
// each controller using req.vendor (populated by attachVendor) instead.
router.post(   "/",    verifyToken, attachVendor, createMenuItem);
router.put(    "/:id", verifyToken, attachVendor, updateMenuItem);
router.delete( "/:id", verifyToken, attachVendor, deleteMenuItem);
router.patch(  "/:id/sold-out", verifyToken, attachVendor, toggleSoldOut);

module.exports = router;