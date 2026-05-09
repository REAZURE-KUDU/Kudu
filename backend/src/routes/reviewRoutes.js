const express = require("express");
const router  = express.Router();
const { submitReview, getVendorReviews, getReviewByOrder } = require("../controllers/reviewController");
const { verifyToken, attachStudent } = require("../middleware/auth");

// Student-protected routes
router.post(  "/",                verifyToken, attachStudent, submitReview);
router.get(   "/order/:orderId",  verifyToken, attachStudent, getReviewByOrder);

// Public — any logged-in student can see vendor reviews
router.get("/vendor/:vendorId", getVendorReviews);

module.exports = router;