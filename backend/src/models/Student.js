// Student.js model
const mongoose = require("mongoose");
const { Schema } = mongoose;

const studentSchema = new Schema(
    {
        authProviderId: { type: String, required: true, unique: true },
        role: {type: String, default: "student", immutable: true},

        //profile
        firstName: {type: String, required: true, trim: true},
        lastName: {type: String, required: true, trim: true},
        email: {type: String, required: true, unique: true, lowercase: true},
        profilePhoto: {type: String}, //URL

        //push notification token(for order status notifications)
        fcmToken: {type: String},
        
        isActive: {type: Boolean, defualt: true},
    },
    {
        timestamps: true,
        collection: "students",
    }
);

module.exports = mongoose.model("Student", studentSchema);