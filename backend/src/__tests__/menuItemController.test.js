//menuItemController.test.js
const {
  getMenuItems,
  getMenuItemById,
  getAllMenuItemsByVendor,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
} = require("../controllers/menuItemController");

const MenuItem = require("../models/MenuItem");

// Mock the MenuItem model
jest.mock("../models/MenuItem");

// Helper to mock res object
const mockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe("MenuItem Controller", () => {
  let req;
  let res;

  beforeEach(() => {
    req = {};
    res = mockResponse();
    jest.clearAllMocks();
  });

  /* =======================
     getMenuItems
  ======================= */
  describe("getMenuItems", () => {
    it("returns available menu items for a vendor", async () => {
      req.query = { vendor: "vendor123" };
      const items = [{ name: "Burger" }];

      MenuItem.find.mockResolvedValue(items);

      await getMenuItems(req, res);

      expect(MenuItem.find).toHaveBeenCalledWith({
        vendor: "vendor123",
        isAvailable: true,
      });
      expect(res.json).toHaveBeenCalledWith(items);
    });

    it("returns 500 on database error", async () => {
      req.query = { vendor: "vendor123" };
      MenuItem.find.mockRejectedValue(new Error("DB error"));

      await getMenuItems(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  /* =======================
     getMenuItemById
  ======================= */
  describe("getMenuItemById", () => {
    it("returns a menu item when found", async () => {
      req.params = { id: "item123" };
      const item = { name: "Pizza" };

      MenuItem.findById.mockResolvedValue(item);

      await getMenuItemById(req, res);

      expect(res.json).toHaveBeenCalledWith(item);
    });

    it("returns 404 if item not found", async () => {
      req.params = { id: "item123" };

      MenuItem.findById.mockResolvedValue(null);

      await getMenuItemById(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        message: "Menu item not found",
      });
    });

    it("returns 500 on database error", async () => {
      req.params = { id: "item123" };
      MenuItem.findById.mockRejectedValue(new Error("DB error"));

      await getMenuItemById(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  /* =======================
     getAllMenuItemsByVendor
  ======================= */
  describe("getAllMenuItemsByVendor", () => {
    it("returns all menu items (available and unavailable) for a vendor", async () => {
      req.params = { vendorId: "vendor123" };
      const items = [
        { name: "Burger", isAvailable: true },
        { name: "Sold Out Wrap", isAvailable: false },
      ];

      MenuItem.find.mockReturnValue({
        sort: jest.fn().mockResolvedValue(items),
      });

      await getAllMenuItemsByVendor(req, res);

      expect(MenuItem.find).toHaveBeenCalledWith({ vendor: "vendor123" });
      expect(res.json).toHaveBeenCalledWith(items);
    });

    it("returns empty array if vendor has no menu items", async () => {
      req.params = { vendorId: "vendor123" };

      MenuItem.find.mockReturnValue({
        sort: jest.fn().mockResolvedValue([]),
      });

      await getAllMenuItemsByVendor(req, res);

      expect(res.json).toHaveBeenCalledWith([]);
    });

    it("returns 500 on database error", async () => {
      req.params = { vendorId: "vendor123" };

      MenuItem.find.mockReturnValue({
        sort: jest.fn().mockRejectedValue(new Error("DB error")),
      });

      await getAllMenuItemsByVendor(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: "DB error" });
    });
  });

  /* =======================
     createMenuItem
  ======================= */
  describe("createMenuItem", () => {
    it("creates a menu item when no duplicate exists", async () => {
      req.body = { vendor: "v1", name: "Burger" };

      MenuItem.findOne.mockResolvedValue(null);
      MenuItem.prototype.save = jest.fn().mockResolvedValue(req.body);

      await createMenuItem(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
    });

    it("returns 409 if duplicate name exists (case-insensitive)", async () => {
      req.body = { vendor: "v1", name: "Burger" };

      MenuItem.findOne.mockResolvedValue({ name: "burger" });

      await createMenuItem(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith({
        message: 'A menu item called "Burger" already exists',
      });
    });

    it("returns 409 on Mongo duplicate key error", async () => {
      req.body = { vendor: "v1", name: "Burger" };

      MenuItem.findOne.mockResolvedValue(null);
      MenuItem.prototype.save = jest.fn().mockRejectedValue({ code: 11000 });

      await createMenuItem(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
    });

    it("returns 400 on validation error", async () => {
      req.body = { vendor: "v1", name: "Burger" };
      MenuItem.findOne.mockResolvedValue(null);
      MenuItem.prototype.save = jest.fn().mockRejectedValue(
        new Error("Validation error")
      );

      await createMenuItem(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  /* =======================
     updateMenuItem
  ======================= */
  describe("updateMenuItem", () => {
    it("updates menu item successfully", async () => {
      req.params = { id: "item123" };
      req.body = { name: "Updated Burger" };

      MenuItem.findById.mockResolvedValue({ vendor: "v1" });
      MenuItem.findOne.mockResolvedValue(null);
      MenuItem.findByIdAndUpdate.mockResolvedValue(req.body);

      await updateMenuItem(req, res);

      expect(res.json).toHaveBeenCalledWith(req.body);
    });

    it("returns 404 if item does not exist before update", async () => {
      req.params = { id: "item123" };
      req.body = { name: "Burger" };

      MenuItem.findById.mockResolvedValue(null);

      await updateMenuItem(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("returns 409 if duplicate name exists", async () => {
      req.params = { id: "item123" };
      req.body = { name: "Burger" };

      MenuItem.findById.mockResolvedValue({ vendor: "v1" });
      MenuItem.findOne.mockResolvedValue({ name: "Burger" });

      await updateMenuItem(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
    });

    it("returns 404 if item not found during update (no name in body)", async () => {
      req.params = { id: "item123" };
      req.body = { price: 99 };

      MenuItem.findByIdAndUpdate.mockResolvedValue(null);

      await updateMenuItem(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: "Menu item not found" });
    });

    it("returns 500 on database error", async () => {
      req.params = { id: "item123" };
      req.body = { price: 99 };
      MenuItem.findByIdAndUpdate.mockRejectedValue(new Error("DB error"));

      await updateMenuItem(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  /* =======================
     deleteMenuItem
  ======================= */
  describe("deleteMenuItem", () => {
    it("deletes menu item successfully", async () => {
      req.params = { id: "item123" };

      MenuItem.findByIdAndDelete.mockResolvedValue({});

      await deleteMenuItem(req, res);

      expect(res.json).toHaveBeenCalledWith({
        message: "Menu item deleted",
      });
    });

    it("returns 404 if item not found", async () => {
      req.params = { id: "item123" };

      MenuItem.findByIdAndDelete.mockResolvedValue(null);

      await deleteMenuItem(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: "Menu item not found" });
    });

    it("returns 500 on database error", async () => {
      req.params = { id: "item123" };
      MenuItem.findByIdAndDelete.mockRejectedValue(new Error("DB error"));

      await deleteMenuItem(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });
});