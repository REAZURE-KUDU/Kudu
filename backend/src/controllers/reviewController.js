//reviewController.js 
const Review = require("../models/Review");
const Order  = require("../models/Order");

// POST /api/reviews
exports.submitReview = async (req, res) => {
  try {
    const { orderId, rating, comment } = req.body;
    const studentId = req.user._id; // set by attachStudent middleware

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ message: "Order not found" });

    if (order.student.toString() !== studentId.toString())
      return res.status(403).json({ message: "Not your order" });

    // UAT 2: must be collected
    if (order.status !== "collected")
      return res.status(400).json({
        message: "Reviews can only be submitted once an order has been collected",
      });

    // UAT 3: no duplicate
    const existing = await Review.findOne({ order: orderId });
    if (existing)
      return res.status(400).json({ message: "You have already reviewed this order" });

    const review = await Review.create({
      order:   orderId,
      student: studentId,
      vendor:  order.vendor,
      rating,
      comment,
    });

    res.status(201).json(review);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/reviews/vendor/:vendorId  — UAT 4 & 5
exports.getVendorReviews = async (req, res) => {
  try {
    const reviews = await Review.find({ vendor: req.params.vendorId })
      .populate("student", "firstName lastName")
      .sort({ createdAt: -1 });
    res.json(reviews);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/reviews/order/:orderId — check if already reviewed
exports.getReviewByOrder = async (req, res) => {
  try {
    const review = await Review.findOne({ order: req.params.orderId });
    res.json(review || null);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};