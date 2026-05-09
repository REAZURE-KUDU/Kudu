const mongoose = require("mongoose");
const { Schema } = mongoose;

const adminSchema = new Schema(
  {
    authProviderId: { type: String, required: true, unique: true },
    role: { type: String, default: "admin", immutable: true },
    // profile
    firstName: { type: String, required: true },
    lastName:  { type: String, required: true },
    email:     { type: String, required: true, unique: true, lowercase: true },
    // permissions
    permissions: {
      type: [String],
      enum: [
        "approve_vendor",
        "suspend_vendor",
        "manage_users",
        "view_analytics",
        "export_reports",
        "manage_menu_items",
      ],
      default: ["approve_vendor", "suspend_vendor", "view_analytics"],
    },
    // audit trail
    lastLoginAt: { type: Date }, // fixed typo: was "typr"
    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true,
    collection: "admins",
  }
);

module.exports = mongoose.model("Admin", adminSchema);