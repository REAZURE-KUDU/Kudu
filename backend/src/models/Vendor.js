const mongoose = require("mongoose");
const { Schema } = mongoose;

const vendorSchema = new Schema(
    {
        authProviderId: { type: String, required: true, unique: true },
        role: {type: String, default: "vendor", immutable: true},

        //Business profile
        businessName: {type: String, required: true, trim: true},
        description: {type: String, trim: true},
        logo: {type: String}, //URL
        bannerImage: {type: String}, //URL
        location: {type: String, trim: true}, //eg. Matrix Food Court, Shop 3

        //Contact
        ownerFirstName: {type: String, required: true},
        ownerLastName: {type: String, required: true},
        email: {type: String, required: true, unique: true, lowercase: true},
        phone: {type: String},

        //operating hours
        operatingHours: [
            {
                day: {type: String,
                    enum: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
                },
                open: {type: String},
                close: {type: String},
                isClosed: {type: Boolean, default: false},
            },
        ],

        //account status - managed by admin
        status: {type: String,
            enum: ["pending", "active", "suspended"],
            default: "pending",
        },

        //admin note when suspending
        statusReason: {type: String},
        suspendedAt: {type: Date},
        approvedBy: {type: Schema.Types.ObjectId, ref: "Admin"},
        approvedAt: {type: Date},

        isActive: {type: Boolean, default: true},
    },
    {
        timestamps: true,
        collection: "vendors",
    }
);

vendorSchema.index({status: 1});
vendorSchema.index({businessName: "text"});

module.exports = mongoose.model("Vendor", vendorSchema);
