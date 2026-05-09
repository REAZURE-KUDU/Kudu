const Order  = require("../models/Order");
const Vendor = require("../models/Vendor");

// Vendor can set these — "paid" is set exclusively by the payment flow
const VALID_STATUSES = [
  "received",
  "preparing",
  "ready",
  "collected",
  "cancelled",
];

// ── Student: get own orders ──────────────────────────────────────────
const getOrders = async (req, res) => {
  try {
    const orders = await Order.find({ student: req.user._id })
      .populate("vendor", "businessName location")
      .sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── Vendor: get orders for their store ──────────────────────────────
const getVendorOrders = async (req, res) => {
  try {
    const { status } = req.query;
    const filter = { vendor: req.vendor._id };
    if (status) filter.status = status;

    const orders = await Order.find(filter)
      .populate("student", "firstName lastName email studentNumber")
      .sort({ createdAt: -1 });

    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── Shared: get single order by id ──────────────────────────────────
const getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate("student", "firstName lastName email")
      .populate("vendor", "businessName location");
    if (!order) return res.status(404).json({ message: "Order not found" });
    res.json(order);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── Student: create order ────────────────────────────────────────────
const createOrder = async (req, res) => {
  try {
    const { vendorId, items, totalAmount } = req.body;
    if (!vendorId || !items?.length || !totalAmount) {
      return res.status(400).json({ message: "Missing required order fields" });
    }

    const vendor = await Vendor.findById(vendorId);
    if (!vendor) return res.status(404).json({ message: "Vendor not found" });
    if (vendor.status === "suspended") {
      return res.status(403).json({ message: "This vendor is currently unavailable." });
    }

    const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

    const order = new Order({
      student:     req.user._id,
      vendor:      vendorId,
      items:       items.map((i) => ({
        menuItem:  i.menuItem,
        name:      i.name,
        unitPrice: i.price,
        quantity:  i.quantity,
        subtotal:  i.price * i.quantity,
        specialNote: i.specialNote,
      })),
      subtotal,
      totalAmount: subtotal,
      status:      "pending",
    });

    await order.save();
    res.status(201).json({ order });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// ── Vendor: advance/update order status ─────────────────────────────
const updateOrderStatus = async (req, res) => {
  try {
    const { status, estimatedReadyAt } = req.body;

    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({ message: `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}` });
    }

    const update = { status };
    if (estimatedReadyAt) update.estimatedReadyAt = new Date(estimatedReadyAt);

    // Auto-set collectionCode when order becomes ready
    if (status === "ready") {
      update.collectionCode = Math.floor(1000 + Math.random() * 9000).toString();
    }

    const order = await Order.findByIdAndUpdate(
      req.params.id,
      update,
      { new: true }
    ).populate("student", "firstName lastName email");

    if (!order) return res.status(404).json({ message: "Order not found" });
    res.json(order);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── Admin: get all orders ───────────────────────────────────────────
const getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find()
      .populate("student", "firstName lastName")
      .populate("vendor", "businessName")
      .sort({ createdAt: -1 });

    res.json(orders); // IMPORTANT: return array
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── Admin: get orders for a specific student ─────────────────────────
const getOrdersByStudent = async (req, res) => {
  try {
    const orders = await Order.find({ student: req.params.studentId })
      .populate("vendor", "businessName location")
      .sort({ createdAt: -1 });

    if (!orders.length) {
      return res.status(200).json({ message: "This student has no orders.", orders: [] });
    }

    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── Admin: get orders for a specific vendor ──────────────────────────
const getOrdersByVendor = async (req, res) => {
  try {
    const orders = await Order.find({ vendor: req.params.vendorId })
      .populate("student", "firstName lastName email")
      .sort({ createdAt: -1 });

    if (!orders.length) {
      return res.status(200).json({ message: "This vendor has no orders.", orders: [] });
    }

    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getOrders, getVendorOrders, getOrderById, createOrder, updateOrderStatus, getAllOrders, getOrdersByStudent,getOrdersByVendor };