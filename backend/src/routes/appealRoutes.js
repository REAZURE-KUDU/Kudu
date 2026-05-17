// routes/appealRoutes.js
const express = require("express");
const router  = express.Router();
const { submitAppeal, getAllAppeals, markReviewed, getVendorAppeal, reinstateVendor} = require("../controllers/appealController");

router.get("/vendor/:vendorId", getVendorAppeal); 
router.post("/", submitAppeal);   // vendor-facing
router.get("/", getAllAppeals);  // admin-facing
router.patch("/:id/review", markReviewed);  // admin-facing 
router.patch("/vendors/:id/reinstate", reinstateVendor);

module.exports = router;