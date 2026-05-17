// backend/server.js
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();
const studentRoutes  = require("./src/routes/studentRoutes");
const vendorRoutes   = require("./src/routes/vendorRoutes");
const adminRoutes    = require("./src/routes/adminRoutes");
const menuItemRoutes = require("./src/routes/menuItemRoutes");
const orderRoutes    = require("./src/routes/orderRoutes");
const authRoutes     = require("./src/routes/auth.routes");
const cartRoutes    = require("./src/routes/cartRoutes");
const paymentRoutes = require("./src/routes/paymentRoutes");
const reviewRoutes = require('./src/routes/reviewRoutes');
const appealRoutes = require("./src/routes/appealRoutes");

const app = express();

app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));

app.get("/", (req, res) => {
  res.send("Server is running");
});

app.use("/api/students", studentRoutes);
app.use("/api/vendors",  vendorRoutes);
app.use("/api/admins",   adminRoutes);
app.use("/api/menu-items",     menuItemRoutes);
app.use("/api/orders",   orderRoutes);
app.use("/api/auth",     authRoutes);
app.use("/api/cart",     cartRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/appeals", appealRoutes);

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch(err => console.error(err));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
  process.exit(1);
});