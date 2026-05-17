// models/Appeal.js
const mongoose = require("mongoose");

const appealSchema = new mongoose.Schema(
  {
    vendor:    { type: mongoose.Schema.Types.ObjectId, ref: "Vendor", required: true },
    message:   { type: String, required: true, maxlength: 1000 },
    status:    { type: String, enum: ["pending", "reviewed"], default: "pending" },
    decision:  { type: String, enum: ["accepted", "rejected"], default: null, },
    rejectionReason: { type: String, default: null, },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Appeal", appealSchema);