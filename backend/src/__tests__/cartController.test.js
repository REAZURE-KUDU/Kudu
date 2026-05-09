jest.mock("../models/Cart");

const Cart = require("../models/Cart");
const {
  getCart,
  addItem,
  updateItemQuantity,
  removeItem,
  clearCart,
} = require("../controllers/cartController");

const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe("Cart Controller", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("getCart", () => {
    it("returns empty cart if none exists", async () => {
      Cart.findOne.mockResolvedValue(null);

      const req = { user: { _id: "student123" } };
      const res = mockRes();

      await getCart(req, res);

      expect(res.json).toHaveBeenCalledWith({
        items: [],
        total: 0,
        itemCount: 0,
      });
    });

    it("returns cart if found", async () => {
      const cart = { items: [{ name: "Burger" }] };
      Cart.findOne.mockResolvedValue(cart);

      const req = { user: { _id: "student123" } };
      const res = mockRes();

      await getCart(req, res);

      expect(res.json).toHaveBeenCalledWith(cart);
    });

    it("handles server error", async () => {
      Cart.findOne.mockRejectedValue(new Error("DB error"));

      const req = { user: { _id: "student123" } };
      const res = mockRes();

      await getCart(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe("addItem", () => {
    it("returns 400 if required fields missing", async () => {
      const req = { user: { _id: "student123" }, body: {} };
      const res = mockRes();

      await addItem(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("creates new cart and adds item", async () => {
      Cart.findOne.mockResolvedValue(null);

      const save = jest.fn();
      Cart.mockImplementation(() => ({
        items: [],
        save,
      }));

      const req = {
        user: { _id: "student123" },
        body: {
          menuItem: "item1",
          name: "Burger",
          price: 25,
          vendor: "vendor1",
          vendorName: "Food Place",
        },
      };
      const res = mockRes();

      await addItem(req, res);

      expect(save).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalled();
    });

    it("increments quantity if item already exists", async () => {
      const cart = {
        items: [
          {
            menuItem: { toString: () => "item1" },
            vendor: { toString: () => "vendor1" },
            quantity: 1,
          },
        ],
        save: jest.fn(),
      };

      Cart.findOne.mockResolvedValue(cart);

      const req = {
        user: { _id: "student123" },
        body: {
          menuItem: "item1",
          name: "Burger",
          price: 25,
          quantity: 2,
          vendor: "vendor1",
          vendorName: "Food Place",
        },
      };
      const res = mockRes();

      await addItem(req, res);

      expect(cart.items[0].quantity).toBe(3);
      expect(cart.save).toHaveBeenCalled();
    });

    // covers line 37 - server error in addItem
    it("handles server error", async () => {
      Cart.findOne.mockRejectedValue(new Error("DB error"));

      const req = {
        user: { _id: "student123" },
        body: {
          menuItem: "item1",
          name: "Burger",
          price: 25,
          vendor: "vendor1",
          vendorName: "Food Place",
        },
      };
      const res = mockRes();

      await addItem(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: "DB error" });
    });
  });

  describe("updateItemQuantity", () => {
    it("returns 404 if cart not found", async () => {
      Cart.findOne.mockResolvedValue(null);

      const req = {
        user: { _id: "student123" },
        params: { itemId: "item1" },
        body: { quantity: 2 },
      };
      const res = mockRes();

      await updateItemQuantity(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    // covers line 59 - item not found in cart
    it("returns 404 if item not found in cart", async () => {
      const cart = {
        items: { id: jest.fn().mockReturnValue(null) },
        save: jest.fn(),
      };

      Cart.findOne.mockResolvedValue(cart);

      const req = {
        user: { _id: "student123" },
        params: { itemId: "nonexistent" },
        body: { quantity: 2 },
      };
      const res = mockRes();

      await updateItemQuantity(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: "Item not found in cart" });
    });

    it("updates item quantity", async () => {
      const item = { quantity: 1 };
      const cart = {
        items: {
          id: jest.fn().mockReturnValue(item),
        },
        save: jest.fn(),
      };

      Cart.findOne.mockResolvedValue(cart);

      const req = {
        user: { _id: "student123" },
        params: { itemId: "item1" },
        body: { quantity: 5 },
      };
      const res = mockRes();

      await updateItemQuantity(req, res);

      expect(item.quantity).toBe(5);
      expect(cart.save).toHaveBeenCalled();
    });

    it("removes item if quantity <= 0", async () => {
      const deleteOne = jest.fn();
      const cart = {
        items: {
          id: jest.fn().mockReturnValue({ deleteOne }),
        },
        save: jest.fn(),
      };

      Cart.findOne.mockResolvedValue(cart);

      const req = {
        user: { _id: "student123" },
        params: { itemId: "item1" },
        body: { quantity: 0 },
      };
      const res = mockRes();

      await updateItemQuantity(req, res);

      expect(deleteOne).toHaveBeenCalled();
    });
  });

  describe("removeItem", () => {
    it("returns 404 if cart not found", async () => {
      Cart.findOne.mockResolvedValue(null);

      const req = {
        user: { _id: "student123" },
        params: { itemId: "item1" },
      };
      const res = mockRes();

      await removeItem(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("removes item from cart", async () => {
      const cart = {
        items: [{ _id: { toString: () => "item1" } }],
        save: jest.fn(),
      };

      Cart.findOne.mockResolvedValue(cart);

      const req = {
        user: { _id: "student123" },
        params: { itemId: "item1" },
      };
      const res = mockRes();

      await removeItem(req, res);

      expect(cart.items.length).toBe(0);
      expect(cart.save).toHaveBeenCalled();
    });

    // covers line 75 - server error in removeItem
    it("handles server error", async () => {
      Cart.findOne.mockRejectedValue(new Error("DB error"));

      const req = {
        user: { _id: "student123" },
        params: { itemId: "item1" },
      };
      const res = mockRes();

      await removeItem(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: "DB error" });
    });
  });

  describe("clearCart", () => {
    it("clears the cart", async () => {
      Cart.findOneAndUpdate.mockResolvedValue({});

      const req = { user: { _id: "student123" } };
      const res = mockRes();

      await clearCart(req, res);

      expect(Cart.findOneAndUpdate).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({
        items: [],
        total: 0,
        itemCount: 0,
      });
    });

    it("handles server error", async () => {
      Cart.findOneAndUpdate.mockRejectedValue(new Error("DB error"));

      const req = { user: { _id: "student123" } };
      const res = mockRes();

      await clearCart(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });
});