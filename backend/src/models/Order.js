// Order.js model
const mongoose = require("mongoose");
const { Schema } = mongoose;

const orderSchema = new Schema(
    {
        student: {type: Schema.Types.ObjectId, ref: "Student", required: true},
        vendor: {type: Schema.Types.ObjectId, ref: "Vendor", required: true},

        //line items(snapshot of menu at time of order)
        items: [
            {
                menuItem: {type: Schema.Types.ObjectId, ref: "MenuItem"},
                name: {type: String, required: true}, //snapshot incase menu changes
                unitPrice: {type: Number, required: true}, // in ZAR cents
                quantity: {type: Number, required: true, min: 1},
                subtotal: {type: Number, required: true},
                specialNote: {type: String},
            },
        ],

        //financials
        subtotal: {type: Number, required: true},
        totalAmount: {type: Number, required: true},

        //order lifecycle
        status:{type: String,
            enum: [
                "pending",    // placed, awaiting vendor confirmation
                "received",   // vendor confirmed, awaiting payment
                "paid",       // payment confirmed
                "preparing",  // kitchen is working on it
                "ready",      // ready for student pickup
                "collected",  // student collected
                "cancelled",  // cancelled by student or vendor
            ],
            default: "pending",
        },
        
        //estimated ready time
        estimatedReadyAt: {type: Date},

        //collection code
        collectionCode: {type: String},

        orderNumber: {type: String, unique: true},
    },
    {
        timestamps: true,
        collection: "orders",
    }
);

orderSchema.index({student: 1, createdAt: -1});
orderSchema.index({vendor: 1, status: 1});

module.exports = mongoose.model("Order", orderSchema);