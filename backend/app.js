//app.js
require("dotenv").config();
const express = require("express");
const cors = require("cors");

const menuItemRoutes = require("./src/routes/menuItemRoutes");
const orderRoutes    = require("./src/routes/orderRoutes");
const studentRoutes  = require("./src/routes/studentRoutes");
const vendorRoutes   = require("./src/routes/vendorRoutes");
const adminRoutes    = require("./src/routes/adminRoutes");
const authRoutes     = require("./src/routes/auth.routes");
const paymentRoutes = require("./src/routes/paymentRoutes");
const reviewRoutes = require('./src/routes/reviewRoutes');

const app = express();

const allowedOrigins = [
  "http://localhost:3000",
  process.env.FRONTEND_URL,
];

// ── Middleware FIRST ─────────────────────────────
app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  }
}));

app.use(express.json());

// ── Routes SECOND ────────────────────────────────
app.use("/api/auth", authRoutes);
app.use("/api/menu-items", menuItemRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/students", studentRoutes);
app.use("/api/vendors", vendorRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/reviews", reviewRoutes);
module.exports = app;
console.log("menuItemRoutes loaded");