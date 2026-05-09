// controllers/cartController.js
const Cart = require("../models/Cart");

const getCart = async (req, res) => {
  try {
    const cart = await Cart.findOne({ student: req.user._id });
    if (!cart) return res.json({ items: [], total: 0, itemCount: 0 });
    res.json(cart);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const addItem = async (req, res) => {
  try {
    const { menuItem, name, price, quantity = 1, vendor, vendorName, imageUrl } = req.body;

    if (!menuItem || !name || !price || !vendor || !vendorName) {
      return res.status(400).json({ message: "Missing required item fields" });
    }

    let cart = await Cart.findOne({ student: req.user._id });
    if (!cart) cart = new Cart({ student: req.user._id, items: [] });

    const existing = cart.items.find(
      (i) => i.menuItem.toString() === menuItem && i.vendor.toString() === vendor
    );

    if (existing) {
      existing.quantity += quantity;
    } else {
      cart.items.push({ menuItem, name, price, quantity, vendor, vendorName, imageUrl });
    }

    await cart.save();
    res.json(cart);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const updateItemQuantity = async (req, res) => {
  try {
    const { quantity } = req.body;
    const cart = await Cart.findOne({ student: req.user._id });
    if (!cart) return res.status(404).json({ message: "Cart not found" });

    const item = cart.items.id(req.params.itemId);
    if (!item) return res.status(404).json({ message: "Item not found in cart" });

    if (quantity <= 0) {
      item.deleteOne();
    } else {
      item.quantity = quantity;
    }

    await cart.save();
    res.json(cart);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const removeItem = async (req, res) => {
  try {
    const cart = await Cart.findOne({ student: req.user._id });
    if (!cart) return res.status(404).json({ message: "Cart not found" });

    cart.items = cart.items.filter(
      (i) => i._id.toString() !== req.params.itemId
    );

    await cart.save();
    res.json(cart);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const clearCart = async (req, res) => {
  try {
    await Cart.findOneAndUpdate(
      { student: req.user._id },
      { items: [] },
      { new: true }
    );
    res.json({ items: [], total: 0, itemCount: 0 });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getCart, addItem, updateItemQuantity, removeItem, clearCart };