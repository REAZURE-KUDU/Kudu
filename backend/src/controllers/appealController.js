const Appeal = require("../models/Appeal");
const Vendor = require("../models/Vendor");

// Nodemailer is lazy-loaded so missing SMTP env vars never crash the module
// on require() — which would kill the Jest worker process.
let _transporter = null;
const getTransporter = () => {
  if (_transporter) return _transporter;
  const nodemailer = require("nodemailer");
  _transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
  return _transporter;
};

const sendMail = async (options) => {
  try {
    await getTransporter().sendMail(options);
  } catch (err) {
    console.error("Email send failed:", err.message);
  }
};

// POST /api/appeals/:vendorId
const submitAppeal = async (req, res) => {
  try {
    const { vendorId } = req.params;
    const { message } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ message: "Appeal message is required." });
    }

    const vendor = await Vendor.findById(vendorId).select("status businessName email");
    if (!vendor) return res.status(404).json({ message: "Vendor not found." });

    if (vendor.status !== "suspended") {
      return res.status(400).json({ message: "Only suspended vendors can submit appeals." });
    }

    const existing = await Appeal.findOne({ vendor: vendorId, status: "pending" });
    if (existing) {
      return res.status(400).json({
        message: "You already have a pending appeal. We will be in touch soon.",
      });
    }

    const appeal = await Appeal.create({ vendor: vendorId, message: message.trim() });

    sendMail({
      from: `"KuduDash" <${process.env.SMTP_USER}>`,
      to: process.env.ADMIN_EMAIL,
      subject: `New suspension appeal — ${vendor.businessName}`,
      text: `Vendor: ${vendor.businessName} (${vendorId})\n\nMessage:\n${message.trim()}`,
    });

    if (vendor.email) {
      sendMail({
        from: `"KuduDash" <${process.env.SMTP_USER}>`,
        to: vendor.email,
        subject: "We received your appeal",
        text: `Hi ${vendor.businessName},\n\nThank you for submitting an appeal. Our team will review it shortly.\n\n— KuduDash Support`,
      });
    }

    return res.status(201).json({ message: "Appeal submitted successfully.", appealId: appeal._id });
  } catch (err) {
    console.error("submitAppeal error:", err);
    return res.status(500).json({ message: err.message });
  }
};

// GET /api/appeals  (admin only)
const getAllAppeals = async (req, res) => {
  try {
    const appeals = await Appeal.find()
      .populate("vendor", "businessName email status statusReason suspendedAt")
      .sort({ createdAt: -1 });
    res.json(appeals);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PATCH /api/appeals/:id/review
const markReviewed = async (req, res) => {
  try {
    const { adminNote, decision, rejectionReason } = req.body;

    const appeal = await Appeal.findByIdAndUpdate(
      req.params.id,
      {
        status: "reviewed",
        adminNote: adminNote || null,
        decision: decision || null,
        rejectionReason: decision === "rejected" ? (rejectionReason?.trim() || null) : null,
      },
      { new: true }
    );

    if (!appeal) return res.status(404).json({ message: "Appeal not found." });

    res.json(appeal);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/appeals/vendor/:vendorId
const getVendorAppeal = async (req, res) => {
  try {
    const appeal = await Appeal.findOne({ vendor: req.params.vendorId });
    if (!appeal) return res.status(404).json({ message: "No pending appeal found." });
    res.json(appeal);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PATCH /api/vendors/:vendorId/reinstate
const reinstateVendor = async (req, res) => {
  try {
    const id = req.params.vendorId || req.params.id;
    const vendor = await Vendor.findByIdAndUpdate(
      id,
      { status: "active", statusReason: null, suspendedAt: null },
      { new: true }
    );
    if (!vendor) return res.status(404).json({ message: "Vendor not found." });
    res.json(vendor);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { submitAppeal, getAllAppeals, markReviewed, getVendorAppeal, reinstateVendor };