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
} = require("../controllers/menuItemController");
const { requireNotSuspended } = require("../controllers/vendorController");

// ⚠️  This MUST come before /:id or Express will treat "vendor" as an id param
router.get("/vendor/:vendorId", getAllMenuItemsByVendor);

router.get("/",      getMenuItems);
router.get("/:id",   getMenuItemById);
router.post("/", requireNotSuspended, createMenuItem);
router.put("/:id", requireNotSuspended, updateMenuItem);
router.delete("/:id", requireNotSuspended, deleteMenuItem);

module.exports = router;