// routes/cartRoutes.js
const express = require("express");
const router  = express.Router();
const { verifyToken, attachStudent } = require("../middleware/auth");
const {
  getCart, addItem, updateItemQuantity, removeItem, clearCart,
} = require("../controllers/cartController");

// All cart routes require a verified, attached student
router.use(verifyToken, attachStudent);

router.get("/",                 getCart);
router.post("/items",           addItem);
router.patch("/items/:itemId",  updateItemQuantity);
router.delete("/items/:itemId", removeItem);
router.delete("/",              clearCart);

module.exports = router;