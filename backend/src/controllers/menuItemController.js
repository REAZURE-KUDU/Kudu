//menuItemController.js
const MenuItem = require("../models/MenuItem");
const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const getMenuItems = async (req, res) => {
  try {
    const items = await MenuItem.find({ vendor: req.query.vendor, isAvailable: true });
    res.json(items);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getMenuItemById = async (req, res) => {
  try {
    const item = await MenuItem.findById(req.params.id);
    if (!item) return res.status(404).json({ message: "Menu item not found" });
    res.json(item);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Admin: fetch ALL menu items for a vendor (available + unavailable)
const getAllMenuItemsByVendor = async (req, res) => {
  try {
    const items = await MenuItem.find({ vendor: req.params.vendorId }).sort({ category: 1, name: 1 });
    res.json(items);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const createMenuItem = async (req, res) => {
  try {
    const { vendor, name } = req.body;
    const duplicate = await MenuItem.findOne({
      vendor,
      name: { $regex: new RegExp(`^${escapeRegex(name.trim())}$`, "i") },
    });
    if (duplicate) {
      return res.status(409).json({ message: `A menu item called "${name}" already exists` });
    }
    const item = new MenuItem(req.body);
    await item.save();
    res.status(201).json(item);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ message: "A menu item with that name already exists" });
    }
    res.status(400).json({ message: err.message });
  }
};

const updateMenuItem = async (req, res) => {
  try {
    const { name } = req.body;
    if (name) {
      const existing = await MenuItem.findById(req.params.id);
      if (!existing) return res.status(404).json({ message: "Menu item not found" });
      const duplicate = await MenuItem.findOne({
        _id: { $ne: req.params.id },
        vendor: existing.vendor,
        name: { $regex: new RegExp(`^${escapeRegex(name.trim())}$`, "i") },
      });
      if (duplicate) {
        return res.status(409).json({ message: `A menu item called "${name}" already exists` });
      }
    }
    const item = await MenuItem.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!item) return res.status(404).json({ message: "Menu item not found" });
    res.json(item);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ message: "A menu item with that name already exists" });
    }
    res.status(500).json({ message: err.message });
  }
};

const deleteMenuItem = async (req, res) => {
  try {
    const item = await MenuItem.findByIdAndDelete(req.params.id);
    if (!item) return res.status(404).json({ message: "Menu item not found" });
    res.json({ message: "Menu item deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  getMenuItems,
  getMenuItemById,
  getAllMenuItemsByVendor,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
};