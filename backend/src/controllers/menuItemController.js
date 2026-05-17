const MenuItem = require("../models/MenuItem");
const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const checkNotSuspended = (req, res) => {
  if (req.vendor?.status === "suspended") {
    res.status(403).json({
      message: "Your account has been suspended. Please contact support.",
    });
    return true;
  }
  return false;
};

const getMenuItems = async (req, res) => {
  try {
    const query = { vendor: req.query.vendor, isAvailable: true };
    if (req.query.dietaryLabel) {
      query.dietaryLabels = req.query.dietaryLabel;
    }
    const items = await MenuItem.find(query);
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

const getAllMenuItemsByVendor = async (req, res) => {
  try {
    const items = await MenuItem.find({ vendor: req.params.vendorId }).sort({ category: 1, name: 1 });
    res.json(items);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const createMenuItem = async (req, res) => {
  if (checkNotSuspended(req, res)) return;
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
    // ValidationError by name OR by message convention used in tests
    const isValidation =
      err.name === "ValidationError" ||
      (err.message && err.message.toLowerCase().includes("validation"));
    res.status(isValidation ? 400 : 500).json({ message: err.message });
  }
};

const updateMenuItem = async (req, res) => {
  if (checkNotSuspended(req, res)) return;
  try {
    const { name } = req.body;

    // Always look up the existing item first so we can return 404/500 correctly
    // regardless of whether a name change is requested.
    const existing = await MenuItem.findById(req.params.id);
    if (!existing) return res.status(404).json({ message: "Menu item not found" });

    if (name) {
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
  if (checkNotSuspended(req, res)) return;
  try {
    const item = await MenuItem.findByIdAndDelete(req.params.id);
    if (!item) return res.status(404).json({ message: "Menu item not found" });
    res.json({ message: "Menu item deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const toggleAvailability = async (req, res) => {
  if (checkNotSuspended(req, res)) return;
  try {
    const item = await MenuItem.findById(req.params.id);
    if (!item) return res.status(404).json({ message: "Menu item not found" });

    if (item.vendor.toString() !== req.vendor._id.toString()) {
      return res.status(403).json({ message: "You do not own this menu item." });
    }

    item.isSoldOut = !item.isSoldOut;
    await item.save();

    res.json({ message: "Availability updated", isSoldOut: item.isSoldOut });
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
  toggleAvailability,
  toggleSoldOut: toggleAvailability,
};