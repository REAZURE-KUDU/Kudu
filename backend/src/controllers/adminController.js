// controllers/adminController.js
const Admin = require("../models/Admin");

const getAllAdmins = async (req, res) => {
  try {
    const admins = await Admin.find();
    res.json(admins);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Matches the student pattern: GET /api/admin/:id where id = Auth0 sub (authProviderId)
const getAdminById = async (req, res) => {
  try {
    console.log(" Looking up admin with authProviderId:", req.params.id);
    
    const all = await Admin.find({}, { authProviderId: 1, email: 1, firstName: 1 });
    console.log(" All admins in DB:", JSON.stringify(all, null, 2));

    const admin = await Admin.findOne({ authProviderId: req.params.id });
    console.log(" Match found:", admin ? admin.email : "NONE");

    if (!admin) return res.status(404).json({ message: "Admin not found" });
    res.json(admin);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const createAdmin = async (req, res) => {
  try {
    const admin = new Admin(req.body);
    await admin.save();
    res.status(201).json(admin);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

const updateAdmin = async (req, res) => {
  try {
    const admin = await Admin.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!admin) return res.status(404).json({ message: "Admin not found" });
    res.json(admin);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getAllAdmins, getAdminById, createAdmin, updateAdmin };