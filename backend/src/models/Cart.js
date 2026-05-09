const mongoose = require("mongoose");
const { Schema } = mongoose;

const cartItemSchema = new Schema({
  menuItem:   { type: Schema.Types.ObjectId, ref: "MenuItem", required: true },
  name:       { type: String,  required: true },
  price:      { type: Number,  required: true },
  quantity:   { type: Number,  required: true, min: 1 },
  vendor:     { type: Schema.Types.ObjectId, ref: "Vendor", required: true },
  vendorName: { type: String,  required: true },
  imageUrl:   { type: String,  default: "" },
});

const cartSchema = new Schema(
  {
    student: { type: Schema.Types.ObjectId, ref: "Student", required: true, unique: true },
    items:   [cartItemSchema],
  },
  { timestamps: true, collection: "carts" }
);

cartSchema.virtual("total").get(function () {
  return this.items.reduce((sum, i) => sum + i.price * i.quantity, 0);
});

cartSchema.virtual("itemCount").get(function () {
  return this.items.reduce((sum, i) => sum + i.quantity, 0);
});

cartSchema.set("toJSON", { virtuals: true });

module.exports = mongoose.model("Cart", cartSchema);